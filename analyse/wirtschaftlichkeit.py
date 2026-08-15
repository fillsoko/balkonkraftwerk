#!/usr/bin/env python3
"""
Wirtschaftlichkeitsrechnung Balkonkraftwerk mit Speicher
========================================================

Anlage : EcoFlow STREAM Komplettset M (2 x 500 Wp + STREAM Ultra 1,92 kWh)
Standort: Zaubzerstrasse 37, 81677 Muenchen (Bogenhausen), ca. 48,15 N / 11,61 O
Situation: Balkon Suedseite, 1. Obergeschoss, Teilverschattung durch Baumbestand

Das Modell rechnet drei Szenarien (worst / normal / best) ueber 20 Jahre mit
- Ertragsmodell (Neigung, Verschattung, Degradation)
- Speichermodell (Round-Trip-Verluste, Standby, Kapazitaetsverlust)
- Eigenverbrauchsmodell (Autarkiegrad, Ueberschusseinspeisung)
- Finanzmodell (Kapitalwert/NPV, interner Zinsfuss/IRR, statische und
  dynamische Amortisation, LCOE = Stromgestehungskosten)

Reine Standardbibliothek. Aufruf: python3 wirtschaftlichkeit.py
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
import csv
import json
import math
import os

# ---------------------------------------------------------------------------
# 1. Referenzdaten Standort Muenchen
# ---------------------------------------------------------------------------
# Spezifischer Jahresertrag einer unverschatteten Anlage in Muenchen,
# Suedausrichtung, inkl. 14 % Systemverluste (Wechselrichter, Kabel, Temperatur,
# Verschmutzung) -- Groessenordnung PVGIS/DWD fuer Suedbayern.
SPEC_YIELD_OPTIMAL = 1120.0   # kWh/kWp/a bei ca. 35 Grad Neigung, Sued

# Ertragsfaktor gegenueber Optimalneigung, Sued:
TILT_FACTOR = {
    "senkrecht_90": 0.70,   # Modul flach am Balkongelaender, 90 Grad
    "schraeg_30": 0.99,     # Aufstaenderung ca. 30-35 Grad ueber Gelaender
    "schraeg_20": 0.94,     # flache Aufstaenderung ca. 20 Grad
}

# Monatliche Ertragsverteilung (Anteil am Jahresertrag), Muenchen, Sued.
# Senkrecht: flachere Kurve, relativ starker Winter, schwacher Hochsommer.
MONTHLY_SHARE = {
    "senkrecht_90": [48, 58, 78, 82, 80, 74, 78, 82, 80, 68, 42, 38],
    "schraeg_30":   [40, 60, 95, 120, 140, 140, 148, 135, 105, 70, 38, 30],
    "schraeg_20":   [36, 56, 92, 122, 145, 146, 154, 138, 104, 66, 34, 27],
}
MONTH_NAMES = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun",
               "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

# Saisonale Verteilung des Haushaltsstromverbrauchs (Anteil am Jahr, %).
# Winter hoeher: Beleuchtung, laengere Innenaufenthalte, Heizungspumpe.
CONSUMPTION_SHARE = [9.5, 8.7, 8.7, 7.8, 7.6, 7.3, 7.4, 7.4, 7.8, 8.5, 9.1, 10.2]

# Standardlastprofil Haushalt (H0-aehnlich), stuendlich, 0-23 Uhr.
# Wird im Code auf Mittelwert 1,0 normiert. Abendspitze ist entscheidend:
# genau sie bedient der Speicher.
LOAD_SHAPE = [0.55, 0.50, 0.45, 0.45, 0.50, 0.70, 1.00, 1.30, 1.20, 1.05,
              1.00, 1.05, 1.15, 1.00, 0.95, 1.00, 1.15, 1.45, 1.70, 1.75,
              1.55, 1.30, 1.00, 0.75]

# Mittlere Tageslaenge (Sonnenstunden mit nutzbarem Ertrag) je Monat, Muenchen.
DAYLIGHT_H = [8.5, 10.0, 11.9, 13.6, 15.3, 16.2, 15.8, 14.3, 12.6, 10.8, 9.0, 8.2]

# Wettertagtypen je Monat: (Anteil der Tage, Ertragsfaktor gegenueber Mitteltag).
# Bildet ab, dass der Monatsertrag aus wenigen starken und vielen schwachen
# Tagen besteht -- genau daran entscheidet sich, wie viel ueberschuessig wird.
DAY_TYPES = [(0.30, 2.00), (0.40, 1.00), (0.30, 0.33)]

# Einspeise-/Ausgabegrenze des Wechselrichters in Deutschland.
AC_LIMIT_W = 800.0


# ---------------------------------------------------------------------------
# 2. Szenario-Definition
# ---------------------------------------------------------------------------
@dataclass
class Scenario:
    name: str
    beschreibung: str

    # --- Anlage ---
    kwp: float = 1.0                    # 2 x 500 Wp
    mount: str = "senkrecht_90"
    shading_factor: float = 0.80        # 1,0 = keine Verschattung; Baeume + Horizont/Nachbarbebauung
    degradation: float = 0.005          # Modulalterung pro Jahr

    # --- Speicher ---
    batt_nominal_kwh: float = 1.92
    batt_usable_share: float = 0.95     # nutzbare Kapazitaet (DoD)
    roundtrip_eff: float = 0.87         # Lade-/Entladewirkungsgrad gesamt
    batt_fade_per_year: float = 0.015   # Kapazitaetsverlust pro Jahr
    standby_w: float = 8.0              # mittlere Dauer-Eigenverbrauch des Geraets
    batt_replace_year: Optional[int] = None
    batt_replace_cost: float = 0.0

    # --- Haushalt / Nutzung ---
    consumption_kwh: float = 2500.0     # Jahresstromverbrauch Haushalt
    coincidence: float = 0.35           # (informativ) Anteil der Last in den PV-Stunden
    intrahour_match: float = 0.70       # Anteil der Stundenlast, den die PV direkt
                                        # treffen kann. Der Rest sind kurze Spitzen
                                        # (Wasserkocher, Herd) bzw. Luecken, die
                                        # ohne Speicher aus dem Netz kommen.

    # --- Preise ---
    price_ct: float = 32.44             # Arbeitspreis Strom, ct/kWh (brutto)
    price_escalation: float = 0.02      # jaehrliche Strompreissteigerung
    feedin_ct: float = 0.0              # Verguetung Ueberschuss, ct/kWh

    # --- Investition ---
    set_price: float = 840.65
    mounting_cost: float = 120.0        # Halterung (NICHT im Set enthalten) + Kleinmaterial
    other_capex: float = 0.0
    subsidy: float = 320.0              # FKG Muenchen: 0,40 EUR/Wp, max. 800 Wp

    # --- Betrieb ---
    opex_per_year: float = 0.0          # Wartung/Reinigung/Versicherung
    insurance_per_year: float = 0.0

    # --- Finanzen ---
    discount_rate: float = 0.02         # Opportunitaetszins (Tagesgeld/Anleihe)
    horizon_years: int = 20
    resale_value: float = 0.0

    def capex_gross(self) -> float:
        return self.set_price + self.mounting_cost + self.other_capex

    def capex_net(self) -> float:
        subsidy = min(self.subsidy, 0.5 * self.capex_gross())  # FKG: max. 50 % der Kosten
        return self.capex_gross() - subsidy

    def subsidy_effective(self) -> float:
        return min(self.subsidy, 0.5 * self.capex_gross())


# ---------------------------------------------------------------------------
# 3. Ertrags- und Energiemodell
# ---------------------------------------------------------------------------
def spec_yield(s: Scenario) -> float:
    """Spezifischer AC-Jahresertrag am Standort in kWh/kWp (Jahr 1)."""
    return SPEC_YIELD_OPTIMAL * TILT_FACTOR[s.mount] * s.shading_factor


def monthly_generation(s: Scenario, year: int = 1) -> List[float]:
    shares = MONTHLY_SHARE[s.mount]
    total = spec_yield(s) * s.kwp * (1 - s.degradation) ** (year - 1)
    ssum = sum(shares)
    return [total * sh / ssum for sh in shares]


def energy_balance(s: Scenario, year: int,
                   battery_kwh: Optional[float] = None,
                   standby_w: Optional[float] = None) -> Dict[str, float]:
    """Energiebilanz eines Betriebsjahres per stuendlichem Dispatch.

    Fuer jeden Monat werden drei repraesentative Tagtypen (sonnig / mittel /
    truebe) stundenweise durchgerechnet:
      1. PV deckt die zeitgleiche Last (Haushalt + Geraete-Standby)
      2. Ueberschuss laedt den Speicher (bis Kapazitaetsgrenze)
      3. Rest geht unverguetet ins Netz
      4. Abends/nachts entlaedt der Speicher gegen die Restlast

    Bewertet wird nicht die "selbst genutzte" Energie, sondern die tatsaechlich
    vermiedene Netzentnahme:
        Ersparnis = eigenverbrauch - standby
    denn das Standby ist eine zusaetzliche Last, die es ohne das Geraet
    nicht gaebe.

    battery_kwh / standby_w erlauben Vergleichsrechnungen (z. B. ohne Speicher).
    """
    cap_nom = s.batt_nominal_kwh if battery_kwh is None else battery_kwh
    sb_w = s.standby_w if standby_w is None else standby_w

    cap = cap_nom * s.batt_usable_share * (1 - s.batt_fade_per_year) ** (year - 1)
    gen_months = monthly_generation(s, year)

    load_norm = [x / (sum(LOAD_SHAPE) / 24) for x in LOAD_SHAPE]
    dt_weight = sum(w * f for w, f in DAY_TYPES)   # Normierung der Tagtypen

    tot = {"erzeugung": 0.0, "standby": 0.0, "direkt": 0.0, "aus_speicher": 0.0,
           "speicherdurchsatz": 0.0, "speicherverlust": 0.0, "einspeisung": 0.0,
           "abregelung": 0.0}

    for m in range(12):
        days = DAYS_IN_MONTH[m]
        gen_day_avg = gen_months[m] / days
        cons_day = s.consumption_kwh * CONSUMPTION_SHARE[m] / 100.0 / days
        standby_day = sb_w * 24 / 1000.0

        # PV-Tagesform: Sinusbogen ueber der Tageslaenge, mittig um 13 Uhr (MESZ-Mix)
        dl = DAYLIGHT_H[m]
        sunrise = 13.0 - dl / 2
        shape = []
        for h in range(24):
            x = (h + 0.5 - sunrise) / dl
            shape.append(max(0.0, math.sin(math.pi * x)) if 0 <= x <= 1 else 0.0)
        ssum = sum(shape) or 1.0

        for weight, factor in DAY_TYPES:
            n = days * weight
            gen_day = gen_day_avg * factor / dt_weight
            soc = 0.0
            for h in range(24):
                pv = gen_day * shape[h] / ssum
                # AC-Begrenzung des Wechselrichters
                clipped = max(0.0, pv - AC_LIMIT_W / 1000.0)
                pv -= clipped

                load = cons_day * load_norm[h] / 24 + standby_day / 24

                # Nur ein Teil der Stundenlast faellt zeitlich wirklich mit der
                # PV-Erzeugung zusammen; kurze Lastspitzen und Erzeugungsluecken
                # innerhalb der Stunde muessen aus Speicher oder Netz gedeckt werden.
                direct = min(pv, load * s.intrahour_match)
                rest_load = load - direct
                surplus = pv - direct

                charge = min(surplus, cap - soc)
                soc += charge
                feed = surplus - charge

                discharge = min(soc, rest_load / s.roundtrip_eff)
                soc -= discharge
                delivered = discharge * s.roundtrip_eff

                tot["direkt"] += direct * n
                tot["aus_speicher"] += delivered * n
                tot["speicherdurchsatz"] += charge * n
                tot["speicherverlust"] += (discharge - delivered) * n
                tot["einspeisung"] += feed * n
                tot["abregelung"] += clipped * n

        tot["erzeugung"] += gen_months[m]
        tot["standby"] += standby_day * days

    self_used = tot["direkt"] + tot["aus_speicher"]
    tot["eigenverbrauch"] = self_used
    # Tatsaechlich vermiedene Netzentnahme des Haushalts
    tot["ersparnis_kwh"] = max(self_used - tot["standby"], 0.0)
    tot["netto_nutzbar"] = self_used + tot["einspeisung"]
    tot["autarkiegrad"] = (tot["ersparnis_kwh"] / s.consumption_kwh
                           if s.consumption_kwh else 0.0)
    tot["eigenverbrauchsquote"] = self_used / tot["erzeugung"] if tot["erzeugung"] else 0.0
    tot["vollzyklen"] = (tot["speicherdurchsatz"] / (cap_nom * s.batt_usable_share)
                         if cap_nom else 0.0)
    return tot


# ---------------------------------------------------------------------------
# 4. Finanzmodell
# ---------------------------------------------------------------------------
def cashflows(s: Scenario) -> List[Dict[str, float]]:
    rows = []
    cum = -s.capex_net()
    cum_disc = -s.capex_net()

    rows.append({
        "jahr": 0, "erzeugung": 0.0, "eigenverbrauch": 0.0, "einspeisung": 0.0,
        "strompreis_ct": 0.0, "ersparnis": 0.0, "einspeiseerloes": 0.0,
        "kosten": s.capex_net(), "cashflow": -s.capex_net(),
        "kumuliert": cum, "cashflow_disk": -s.capex_net(), "kumuliert_disk": cum_disc,
    })

    for y in range(1, s.horizon_years + 1):
        e = energy_balance(s, y)
        price = s.price_ct / 100.0 * (1 + s.price_escalation) ** (y - 1)
        saving = e["ersparnis_kwh"] * price
        feedin = e["einspeisung"] * s.feedin_ct / 100.0

        cost = s.opex_per_year + s.insurance_per_year
        if s.batt_replace_year is not None and y == s.batt_replace_year:
            cost += s.batt_replace_cost

        cf = saving + feedin - cost
        if y == s.horizon_years:
            cf += s.resale_value

        cum += cf
        disc = cf / (1 + s.discount_rate) ** y
        cum_disc += disc

        rows.append({
            "jahr": y,
            "erzeugung": e["erzeugung"],
            "eigenverbrauch": e["ersparnis_kwh"],
            "einspeisung": e["einspeisung"],
            "strompreis_ct": price * 100,
            "ersparnis": saving,
            "einspeiseerloes": feedin,
            "kosten": cost,
            "cashflow": cf,
            "kumuliert": cum,
            "cashflow_disk": disc,
            "kumuliert_disk": cum_disc,
        })
    return rows


def payback(rows: List[Dict[str, float]], key: str = "kumuliert") -> Optional[float]:
    """Amortisationszeit in Jahren mit linearer Interpolation innerhalb des Jahres."""
    for i in range(1, len(rows)):
        if rows[i][key] >= 0:
            prev = rows[i - 1][key]
            cur = rows[i][key]
            if cur == prev:
                return float(rows[i]["jahr"])
            frac = -prev / (cur - prev)
            return rows[i - 1]["jahr"] + frac
    return None


def npv(rows: List[Dict[str, float]]) -> float:
    return rows[-1]["kumuliert_disk"]


def irr(rows: List[Dict[str, float]]) -> Optional[float]:
    """Interner Zinsfuss per Bisektion."""
    flows = [r["cashflow"] for r in rows]

    def f(rate: float) -> float:
        return sum(cf / (1 + rate) ** i for i, cf in enumerate(flows))

    lo, hi = -0.95, 1.5
    if f(lo) * f(hi) > 0:
        return None
    for _ in range(300):
        mid = (lo + hi) / 2
        if f(lo) * f(mid) <= 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def lcoe(s: Scenario, rows: List[Dict[str, float]]) -> float:
    """Stromgestehungskosten ct/kWh (diskontierte Kosten / diskontierte Nutzenergie)."""
    cost = s.capex_net()
    energy = 0.0
    for r in rows[1:]:
        y = r["jahr"]
        cost += r["kosten"] / (1 + s.discount_rate) ** y
        energy += r["eigenverbrauch"] / (1 + s.discount_rate) ** y
    return cost / energy * 100 if energy else float("nan")


# ---------------------------------------------------------------------------
# 5. Die drei Szenarien
# ---------------------------------------------------------------------------
WORST = Scenario(
    name="Worst Case",
    beschreibung=(
        "Senkrecht am Gelaender, starke Baumverschattung und Horizontabschattung "
        "durch Gegenbebauung, kleiner Haushalt mit wenig Tageslast, guenstiger "
        "Stromtarif ohne Preissteigerung, keine Foerderung, Speichertausch in Jahr 12."
    ),
    mount="senkrecht_90",
    shading_factor=0.62,
    consumption_kwh=1800.0,
    coincidence=0.28,
    intrahour_match=0.60,
    standby_w=14.0,
    roundtrip_eff=0.80,
    batt_fade_per_year=0.025,
    batt_replace_year=12,
    batt_replace_cost=450.0,
    price_ct=28.0,
    price_escalation=0.0,
    feedin_ct=0.0,
    mounting_cost=180.0,
    subsidy=0.0,
    opex_per_year=10.0,
    degradation=0.006,
    discount_rate=0.03,
)

NORMAL = Scenario(
    name="Normal Case",
    beschreibung=(
        "Senkrecht am Gelaender, moderate Teilverschattung durch Baeume, "
        "2-Personen-Haushalt mit Homeoffice-Anteil, SWM-Grundversorgungspreis "
        "mit 2 % Steigerung p. a., Muenchner FKG-Zuschuss beantragt."
    ),
    mount="senkrecht_90",
    shading_factor=0.80,
    consumption_kwh=2500.0,
    coincidence=0.35,
    intrahour_match=0.70,
    standby_w=8.0,
    roundtrip_eff=0.87,
    batt_fade_per_year=0.015,
    price_ct=32.44,
    price_escalation=0.02,
    feedin_ct=0.0,
    mounting_cost=120.0,
    subsidy=320.0,
    opex_per_year=5.0,
    discount_rate=0.02,
)

BEST = Scenario(
    name="Best Case",
    beschreibung=(
        "Aufgestaenderte Montage ca. 20 Grad (Gelaender-Aufstaenderung), Baeume nur "
        "morgens/abends im Weg, 3-Personen-Haushalt mit hoher Grundlast, "
        "Grundversorgungstarif mit 3,5 % Steigerung p. a., FKG-Zuschuss, "
        "optimiertes Standby per Firmware."
    ),
    mount="schraeg_20",
    shading_factor=0.90,
    consumption_kwh=3500.0,
    coincidence=0.45,
    intrahour_match=0.80,
    standby_w=4.0,
    roundtrip_eff=0.90,
    batt_fade_per_year=0.010,
    price_ct=36.0,
    price_escalation=0.035,
    feedin_ct=0.0,
    mounting_cost=90.0,
    subsidy=320.0,
    opex_per_year=0.0,
    degradation=0.004,
    discount_rate=0.01,
)

SCENARIOS = [WORST, NORMAL, BEST]


# ---------------------------------------------------------------------------
# 6. Zusatzanalysen
# ---------------------------------------------------------------------------
# Mehrkosten des Speichers gegenueber einem reinen 1-kWp-Set mit
# 800-W-Mikrowechselrichter (Marktpreis ca. 320 EUR fuer 2 x 500 Wp + WR).
BATTERY_EXTRA_COST = 520.0


def battery_marginal_value(s: Scenario) -> Dict[str, float]:
    """Was bringt der Speicher gegenueber der reinen Modul-/Wechselrichterloesung?

    Vergleich mit identischen Modulen, aber ohne Batterie: niedrigerer
    Eigenverbrauch, dafuer kaum Standby (ca. 2 W) und keine Round-Trip-Verluste.
    """
    e_with = energy_balance(s, 1)
    e_without = energy_balance(s, 1, battery_kwh=0.0, standby_w=2.0)
    price = s.price_ct / 100.0

    delta_kwh = e_with["ersparnis_kwh"] - e_without["ersparnis_kwh"]
    delta_eur = delta_kwh * price
    return {
        "eigenverbrauch_mit_speicher": e_with["ersparnis_kwh"],
        "eigenverbrauch_ohne_speicher": e_without["ersparnis_kwh"],
        "quote_mit": e_with["eigenverbrauchsquote"],
        "quote_ohne": e_without["eigenverbrauchsquote"],
        "mehrertrag_kwh": delta_kwh,
        "mehrertrag_eur": delta_eur,
        "speicher_mehrkosten_eur": BATTERY_EXTRA_COST,
        "amortisation_speicher_jahre": (BATTERY_EXTRA_COST / delta_eur
                                        if delta_eur > 0 else float("inf")),
        "vollzyklen": e_with["vollzyklen"],
    }


def battery_sizing(s: Scenario) -> List[Dict[str, float]]:
    """Vergleich der Speichergroessen: ohne / STREAM Ultra / STREAM Ultra X."""
    out = []
    price = s.price_ct / 100.0
    for label, cap, extra in [("ohne Speicher", 0.0, 0.0),
                              ("Ultra 1,92 kWh", 1.92, BATTERY_EXTRA_COST),
                              ("Ultra X 3,84 kWh", 3.84, BATTERY_EXTRA_COST + 450.0)]:
        e = energy_balance(s, 1, battery_kwh=cap, standby_w=(2.0 if cap == 0 else s.standby_w))
        out.append({
            "variante": label,
            "kapazitaet": cap,
            "eigenverbrauch_kwh": e["ersparnis_kwh"],
            "quote": e["eigenverbrauchsquote"],
            "ersparnis_eur": e["ersparnis_kwh"] * price,
            "mehrkosten_eur": extra,
            "vollzyklen": e["vollzyklen"],
        })
    return out


def sensitivity(base: Scenario, param: str, values: list) -> List[Dict[str, float]]:
    out = []
    for v in values:
        s = Scenario(**{**asdict(base), param: v})
        rows = cashflows(s)
        out.append({
            "wert": v,
            "npv": npv(rows),
            "amortisation": payback(rows) or float("nan"),
            "irr": (irr(rows) or float("nan")) * 100,
            "ertrag_jahr1": energy_balance(s, 1)["erzeugung"],
        })
    return out


# ---------------------------------------------------------------------------
# 7. Ausgabe
# ---------------------------------------------------------------------------
def fmt_eur(x: float) -> str:
    return f"{x:,.0f} EUR".replace(",", ".")


def main() -> None:
    outdir = os.path.dirname(os.path.abspath(__file__))
    summary = []

    print("=" * 78)
    print("WIRTSCHAFTLICHKEITSRECHNUNG BALKONKRAFTWERK MIT SPEICHER")
    print("EcoFlow STREAM Komplettset M | Zaubzerstrasse 37, 81677 Muenchen")
    print("=" * 78)

    for s in SCENARIOS:
        rows = cashflows(s)
        e1 = energy_balance(s, 1)
        pb = payback(rows)
        pb_d = payback(rows, "kumuliert_disk")
        r = irr(rows)
        total20 = sum(x["cashflow"] for x in rows[1:])

        print(f"\n--- {s.name} ---")
        print(s.beschreibung)
        print(f"  Montage / Verschattungsfaktor : {s.mount} / {s.shading_factor:.2f}")
        print(f"  Spezifischer Ertrag           : {spec_yield(s):.0f} kWh/kWp/a")
        print(f"  Erzeugung Jahr 1              : {e1['erzeugung']:.0f} kWh")
        print(f"  ./. Standby Speicher          : {e1['standby']:.0f} kWh")
        print(f"  ./. Speicherverluste          : {e1['speicherverlust']:.0f} kWh")
        print(f"  = netto nutzbar               : {e1['netto_nutzbar']:.0f} kWh")
        print(f"  davon selbst genutzt          : {e1['eigenverbrauch']:.0f} kWh "
              f"({e1['eigenverbrauchsquote']*100:.0f} % der Erzeugung)")
        print(f"  = wirksame Ersparnis          : {e1['ersparnis_kwh']:.0f} kWh "
              f"(Netzbezug vermieden, Standby abgezogen)")
        print(f"  Ueberschuss ins Netz          : {e1['einspeisung']:.0f} kWh (unverguetet)")
        print(f"  Autarkiegrad                  : {e1['autarkiegrad']*100:.0f} %")
        print(f"  Investition brutto            : {fmt_eur(s.capex_gross())}")
        print(f"  ./. Foerderung FKG            : {fmt_eur(s.subsidy_effective())}")
        print(f"  = Netto-Investition           : {fmt_eur(s.capex_net())}")
        print(f"  Ersparnis Jahr 1              : {rows[1]['ersparnis']:.0f} EUR")
        print(f"  Amortisation (statisch)       : {pb:.1f} Jahre" if pb else
              "  Amortisation (statisch)       : nicht innerhalb 20 Jahren")
        print(f"  Amortisation (dynamisch)      : {pb_d:.1f} Jahre" if pb_d else
              "  Amortisation (dynamisch)      : nicht innerhalb 20 Jahren")
        print(f"  Gesamtueberschuss 20 Jahre    : {fmt_eur(total20 - s.capex_net())}")
        print(f"  Kapitalwert NPV @{s.discount_rate*100:.0f}%        : {fmt_eur(npv(rows))}")
        print(f"  Interner Zinsfuss IRR         : {r*100:.1f} % p.a." if r else
              "  Interner Zinsfuss IRR         : negativ")
        print(f"  Stromgestehungskosten LCOE    : {lcoe(s, rows):.1f} ct/kWh")

        bm = battery_marginal_value(s)
        print(f"  [Speicher isoliert] Mehrertrag: {bm['mehrertrag_kwh']:.0f} kWh/a "
              f"= {bm['mehrertrag_eur']:.0f} EUR/a -> Amortisation des Speichers "
              f"{bm['amortisation_speicher_jahre']:.1f} Jahre")

        summary.append({
            "szenario": s.name,
            "spez_ertrag_kwh_kwp": round(spec_yield(s)),
            "erzeugung_j1_kwh": round(e1["erzeugung"]),
            "netto_nutzbar_kwh": round(e1["netto_nutzbar"]),
            "eigenverbrauch_kwh": round(e1["eigenverbrauch"]),
            "standby_kwh": round(e1["standby"]),
            "wirksame_ersparnis_kwh": round(e1["ersparnis_kwh"]),
            "einspeisung_kwh": round(e1["einspeisung"]),
            "eigenverbrauchsquote_prozent": round(e1["eigenverbrauchsquote"] * 100),
            "autarkie_prozent": round(e1["autarkiegrad"] * 100),
            "invest_brutto_eur": round(s.capex_gross(), 2),
            "foerderung_eur": round(s.subsidy_effective(), 2),
            "invest_netto_eur": round(s.capex_net(), 2),
            "ersparnis_j1_eur": round(rows[1]["ersparnis"], 2),
            "amortisation_statisch_a": round(pb, 1) if pb else None,
            "amortisation_dynamisch_a": round(pb_d, 1) if pb_d else None,
            "ueberschuss_20a_eur": round(total20 - s.capex_net()),
            "npv_eur": round(npv(rows)),
            "irr_prozent": round(r * 100, 1) if r else None,
            "lcoe_ct_kwh": round(lcoe(s, rows), 1),
        })

        with open(os.path.join(outdir, f"cashflow_{s.name.split()[0].lower()}.csv"),
                  "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()), delimiter=";")
            w.writeheader()
            for row in rows:
                w.writerow({k: (round(v, 2) if isinstance(v, float) else v)
                            for k, v in row.items()})

    # Monatsertrag Normal Case
    print("\n--- Monatsertrag Jahr 1 (kWh) ---")
    header = "  Szenario   " + " ".join(f"{m:>5}" for m in MONTH_NAMES) + "   Summe"
    print(header)
    for s in SCENARIOS:
        mg = monthly_generation(s)
        print(f"  {s.name.split()[0]:<10} " + " ".join(f"{v:5.0f}" for v in mg)
              + f"   {sum(mg):5.0f}")

    # Speichergroesse: lohnt der Akku ueberhaupt, und wenn ja welcher?
    print("\n--- Speichergroesse im Vergleich (Jahr 1) ---")
    sizing_out = {}
    for s in SCENARIOS:
        print(f"\n  {s.name} (Strompreis {s.price_ct:.2f} ct/kWh):")
        print(f"    {'Variante':<18} {'Eigenverbr.':>12} {'Quote':>7} "
              f"{'Ersparnis':>11} {'Mehrkosten':>11} {'Zyklen/a':>9} {'Amort.':>9}")
        rows_ = battery_sizing(s)
        base = rows_[0]["ersparnis_eur"]
        for r_ in rows_:
            delta = r_["ersparnis_eur"] - base
            amort = (r_["mehrkosten_eur"] / delta) if delta > 0.01 else float("inf")
            amort_s = f"{amort:.0f} a" if amort < 100 else "nie"
            print(f"    {r_['variante']:<18} {r_['eigenverbrauch_kwh']:9.0f} kWh "
                  f"{r_['quote']*100:6.1f} % {r_['ersparnis_eur']:9.0f} E "
                  f"{r_['mehrkosten_eur']:9.0f} E {r_['vollzyklen']:9.0f} {amort_s:>9}")
        sizing_out[s.name] = rows_

    # Sensitivitaeten auf Basis Normal Case
    print("\n--- Sensitivitaet (Basis: Normal Case) ---")
    sens_out = {}
    for param, values, label in [
        ("shading_factor", [0.55, 0.65, 0.75, 0.85, 0.95], "Verschattungsfaktor"),
        ("price_ct", [24.0, 28.0, 32.44, 36.0, 42.0], "Strompreis ct/kWh"),
        ("standby_w", [2.0, 5.0, 8.0, 12.0, 18.0], "Standby W"),
        ("subsidy", [0.0, 160.0, 320.0], "Foerderung EUR"),
        ("consumption_kwh", [1500.0, 2000.0, 2500.0, 3500.0, 4500.0], "Verbrauch kWh/a"),
        ("mount", ["senkrecht_90", "schraeg_20", "schraeg_30"], "Montageart"),
    ]:
        res = sensitivity(NORMAL, param, values)
        sens_out[param] = res
        print(f"\n  {label}:")
        print(f"    {'Wert':>10} {'Amortisation':>14} {'NPV':>12} {'IRR':>8}")
        for r_ in res:
            pbv = f"{r_['amortisation']:.1f} a" if r_["amortisation"] == r_["amortisation"] else "> 20 a"
            wert = (f"{r_['wert']:.2f}" if isinstance(r_["wert"], float) else str(r_["wert"]))
            print(f"    {wert:>12} {pbv:>14} {r_['npv']:>10.0f} E {r_['irr']:>7.1f} %")

    with open(os.path.join(outdir, "ergebnis_uebersicht.json"), "w", encoding="utf-8") as fh:
        json.dump({"szenarien": summary, "sensitivitaet": sens_out,
                   "speichergroesse": sizing_out}, fh, indent=2, ensure_ascii=False)

    print("\nDateien geschrieben: cashflow_*.csv, ergebnis_uebersicht.json")


if __name__ == "__main__":
    main()
