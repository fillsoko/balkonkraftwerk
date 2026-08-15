# Wirtschaftlichkeitsrechnung Balkonkraftwerk mit Speicher

**Anlage:** EcoFlow STREAM Komplettset M — 2 × 500 Wp + STREAM Ultra 1,92 kWh
**Angebot:** Svea Solar, 840,65 € (statt 989,00 €), inkl. MwSt., versandkostenfrei
**Standort:** Zaubzerstraße 37, 81677 München-Bogenhausen (48,15 °N / 11,61 °O)
**Situation:** Balkon Südseite, 1. Obergeschoss, Teilverschattung durch Baumbestand
**Stand:** August 2026

---

## 1. Ergebnis auf einen Blick

| Kennzahl (Jahr 1, 20-Jahres-Horizont) | Worst Case | Normal Case | Best Case |
|---|---:|---:|---:|
| Spezifischer Ertrag | 486 kWh/kWp | 627 kWh/kWp | 948 kWh/kWp |
| **Stromerzeugung** | **486 kWh** | **627 kWh** | **948 kWh** |
| ./. Standby des Speichergeräts | −123 kWh | −70 kWh | −35 kWh |
| ./. Speicher-/Wandlungsverluste | −25 kWh | −15 kWh | −17 kWh |
| Überschuss ins Netz (unvergütet) | 0 kWh | 0 kWh | 24 kWh |
| **Wirksam vermiedener Netzbezug** | **338 kWh** | **542 kWh** | **871 kWh** |
| Autarkiegrad | 19 % | 22 % | 25 % |
| Investition brutto (inkl. Halterung) | 1.021 € | 961 € | 931 € |
| ./. Förderung Stadt München (FKG) | 0 € | −320 € | −320 € |
| **Netto-Investition** | **1.021 €** | **641 €** | **611 €** |
| Ersparnis Jahr 1 | 95 € | 176 € | 314 € |
| **Amortisation (statisch)** | **18,7 Jahre** | **3,7 Jahre** | **1,9 Jahre** |
| Amortisation (dynamisch, abgezinst) | > 20 Jahre | 3,9 Jahre | 1,9 Jahre |
| **Gesamtüberschuss nach 20 Jahren** | **+93 €** | **+3.303 €** | **+7.899 €** |
| Kapitalwert (NPV) | −163 € | +2.552 € | +6.990 € |
| Interner Zinsfuß (IRR) | 0,9 % p. a. | 27,9 % p. a. | 54,4 % p. a. |
| Stromgestehungskosten (LCOE) | 31,5 ct/kWh | 8,6 ct/kWh | 4,0 ct/kWh |

**Kurzfazit:** Im Normalfall rechnet sich die Anlage nach knapp 4 Jahren und wirft
über 20 Jahre rund 3.300 € ab — das ist eine sehr gute Rendite. Der Worst Case ist
allerdings kein theoretisches Konstrukt: Er tritt real ein, wenn (a) die Förderung
nicht beantragt wird, (b) die Bäume stärker verschatten als gedacht und (c) das
Standby des Speichers hoch bleibt. Dann ist die Anlage nach 20 Jahren gerade eben
bei null.

---

## 2. Die drei Szenarien im Detail

### Worst Case — „ungünstig gelaufen"
- Senkrechte Montage flach am Geländer (Ertragsfaktor 0,70)
- Starke Verschattung durch Bäume + Horizontabschattung durch Gegenbebauung: Faktor 0,62
- Standby des STREAM Ultra dauerhaft bei 14 W → 123 kWh/Jahr Eigenbedarf
- Kleiner Haushalt (1.800 kWh/a), wenig Tageslast
- Günstiger Stromtarif 28 ct/kWh, **keine** Preissteigerung
- **Keine Förderung** (zu spät beantragt — siehe Abschnitt 5)
- Speichertausch in Jahr 12 für 450 €
- Kalkulationszins 3 %

→ Die Anlage produziert 20 Jahre lang Strom, spart aber nur ca. 95 €/Jahr.
Nach 20 Jahren steht ein Plus von 93 € — nach Abzinsung ein Minus von 163 €.
Das ist wirtschaftlich neutral bis leicht negativ.

### Normal Case — realistische Erwartung
- Senkrechte Montage am Geländer
- Moderate Teilverschattung durch Bäume: Faktor 0,80
- Standby 8 W → 70 kWh/Jahr
- 2-Personen-Haushalt, 2.500 kWh/a, Homeoffice-Anteil
- SWM-Grundversorgung 32,44 ct/kWh, +2 % p. a.
- Münchner FKG-Zuschuss 320 € beantragt
- Kalkulationszins 2 %

→ 176 € Ersparnis im ersten Jahr, steigend mit dem Strompreis. Amortisation
nach 3,7 Jahren, 3.303 € Überschuss über 20 Jahre, IRR 27,9 %.

### Best Case — alles läuft optimal
- Aufständerung ca. 20° über dem Geländer (Ertragsfaktor 0,94 statt 0,70)
- Bäume stören nur morgens/abends: Faktor 0,90
- Standby per Firmware auf 4 W optimiert
- 3-Personen-Haushalt, 3.500 kWh/a, hohe Grundlast
- Strompreis 36 ct/kWh, +3,5 % p. a.
- FKG-Zuschuss, günstige Halterung
- Kalkulationszins 1 %

→ Amortisation nach unter 2 Jahren, 7.899 € über 20 Jahre.

---

## 3. Monatsertrag (Jahr 1, kWh)

| Szenario | Jan | Feb | Mrz | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez | **Summe** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Worst | 29 | 35 | 47 | 49 | 48 | 45 | 47 | 49 | 48 | 41 | 25 | 23 | **486** |
| Normal | 37 | 45 | 61 | 64 | 62 | 57 | 61 | 64 | 62 | 53 | 33 | 29 | **627** |
| Best | 30 | 47 | 78 | 103 | 123 | 124 | 130 | 117 | 88 | 56 | 29 | 23 | **948** |

Der Unterschied in der Kurvenform ist wichtig: **Senkrechte Module haben ein
flaches Jahresprofil.** Sie liefern im Dezember noch etwa die Hälfte des
Juniwertes (51 %), während die aufgeständerte Variante im Dezember auf 18 % des
Juniwertes einbricht — die tiefstehende Wintersonne trifft senkrechte Module
fast im rechten Winkel. Genau deshalb ist
die senkrechte Montage bei kleinen Anlagen mit hoher Eigenverbrauchsquote gar
nicht so schlecht, wie die reine Jahressumme vermuten lässt: Der Winterstrom ist
der wertvollere, weil er sicher selbst verbraucht wird.

---

## 4. Der wichtigste Befund: Der Speicher trägt sich kaum selbst

Das Set kostet ca. **520 € mehr** als reine Module mit 800-W-Mikrowechselrichter.
Was bringt dieser Aufpreis?

| | ohne Speicher | Ultra 1,92 kWh | Ultra X 3,84 kWh |
|---|---:|---:|---:|
| **Worst Case** — Ersparnis/Jahr | 93 € | 95 € | 95 € |
| Eigenverbrauchsquote | 72 % | 95 % | 95 % |
| Amortisation des Aufpreises | — | **nie** | **nie** |
| **Normal Case** — Ersparnis/Jahr | 158 € | 176 € | 176 € |
| Eigenverbrauchsquote | 81 % | 98 % | 98 % |
| Amortisation des Aufpreises | — | **30 Jahre** | 55 Jahre |
| **Best Case** — Ersparnis/Jahr | 263 € | 314 € | 321 € |
| Eigenverbrauchsquote | 79 % | 96 % | 98 % |
| Amortisation des Aufpreises | — | **10 Jahre** | 17 Jahre |

Der Grund ist simpel: **1 kWp ist zu klein für einen Speicher.** Die Anlage
erzeugt in der Spitze rund 250–400 W, die Grundlast eines Haushalts liegt
tagsüber schon bei 150–300 W. Es bleibt kaum Überschuss übrig, den der Speicher
überhaupt einsammeln könnte — er kommt nur auf **64–95 Vollzyklen pro Jahr**
(die 6.000 Zyklen der LFP-Zelle werden also nie ausgeschöpft; es altert der
Kalender, nicht die Nutzung).

Dazu kommt das Standby: Das Gerät zieht dauerhaft Strom. Bei 8 W sind das
70 kWh/Jahr — das ist mehr, als der Speicher im Normal Case an zusätzlichem
Eigenverbrauch überhaupt erwirtschaftet (54 kWh/Jahr). **Im Normal Case frisst
das Standby den kompletten Nutzen des Speichers auf.**

### Zwei konkrete Konsequenzen

1. **Die Ultra X (3,84 kWh) lohnt sich hier definitiv nicht.** Sie kostet
   ca. 450 € mehr und bringt im Normal Case exakt 0 kWh zusätzlich, im Best Case
   20 kWh/Jahr (≈ 7 €). Falls das Set eine Wahl zwischen Ultra und Ultra X
   anbietet: **Ultra 1,92 kWh nehmen.**
2. **Prüfen Sie den Standby-Verbrauch nach dem Kauf** in der EcoFlow-App
   (Nachtverbrauch bei leerer Batterie). Liegt er dauerhaft über 10 W, lohnt sich
   die Überlegung, den Speicher in den ertragsschwachen Monaten
   (November–Februar) vom Netz zu nehmen — dann läuft nur der Wechselrichter.

---

## 5. Förderung: 320 € — aber nur mit Antrag *vor* dem Kauf

Die Stadt München fördert Balkonkraftwerke über das Programm
**„Förderprogramm Klimaneutrale Gebäude" (FKG)**:

- **0,40 €/Wp**, maximal 800 Wp pro Wohneinheit → **maximal 320 €**
- zusätzlich gedeckelt auf **50 % der förderfähigen Kosten** (hier nicht bindend)
- **Der Antrag muss vor der Bestellung gestellt werden.** Wer vorher kauft,
  verliert den Anspruch vollständig.
- Mittel werden nur vergeben, solange das Budget reicht

Bei 961 € Bruttokosten sind 320 € genau **ein Drittel der Investition**. Der
Einfluss ist entsprechend groß:

| Förderung | Amortisation | NPV | IRR |
|---:|---:|---:|---:|
| 0 € | 5,4 Jahre | 2.232 € | 18,5 % |
| 160 € | 4,6 Jahre | 2.392 € | 22,3 % |
| 320 € | 3,7 Jahre | 2.552 € | 27,9 % |

> **Das ist der wichtigste einzelne Handlungspunkt dieser Rechnung: erst den
> FKG-Antrag stellen, dann bestellen.** Der Aktionsrabatt von Svea Solar beträgt
> 148,35 € — die Förderung ist mit 320 € mehr als doppelt so viel wert. Beides
> zusammen bekommt man nur, wenn die Reihenfolge stimmt.

---

## 6. Sensitivitäten (Basis: Normal Case)

Welcher Parameter bewegt das Ergebnis wie stark?

**Verschattung** (der größte Hebel am Standort)

| Faktor | Ertrag J1 | Amortisation | NPV | IRR |
|---:|---:|---:|---:|---:|
| 0,55 (stark) | 431 kWh | 5,6 J | 1.425 € | 17,9 % |
| 0,65 | 510 kWh | 4,6 J | 1.879 € | 22,0 % |
| 0,75 | 588 kWh | 3,9 J | 2.329 € | 26,0 % |
| 0,85 | 666 kWh | 3,4 J | 2.774 € | 29,8 % |
| 0,95 (frei) | 745 kWh | 3,1 J | 3.214 € | 33,5 % |

**Montageart** (der größte Hebel, den Sie selbst in der Hand haben)

| Montage | Amortisation | NPV | IRR |
|---|---:|---:|---:|
| senkrecht 90° am Geländer | 3,7 J | 2.552 € | 27,9 % |
| aufgeständert ca. 20° | **2,8 J** | **3.532 €** | 36,2 % |
| aufgeständert ca. 30° | 2,7 J | 3.750 € | 38,1 % |

**Strompreis**

| ct/kWh | Amortisation | NPV | IRR |
|---:|---:|---:|---:|
| 24,00 | 5,0 J | 1.700 € | 20,4 % |
| 28,00 | 4,3 J | 2.104 € | 24,0 % |
| 32,44 (SWM heute) | 3,7 J | 2.552 € | 27,9 % |
| 36,00 | 3,3 J | 2.912 € | 31,0 % |
| 42,00 | 2,8 J | 3.518 € | 36,1 % |

**Standby-Verbrauch des Speichers**

| Watt | kWh/a | Amortisation | NPV |
|---:|---:|---:|---:|
| 2 W | 18 | 3,4 J | 2.883 € |
| 5 W | 44 | 3,5 J | 2.718 € |
| 8 W | 70 | 3,7 J | 2.552 € |
| 12 W | 105 | 3,9 J | 2.332 € |
| 18 W | 158 | 4,4 J | 2.000 € |

**Haushaltsverbrauch** — auffällig schwach: zwischen 1.500 und 4.500 kWh/a
bewegt sich die Amortisation nur von 3,9 auf 3,6 Jahre. Grund: Die Anlage ist so
klein, dass praktisch alles selbst verbraucht wird, sobald überhaupt eine
normale Grundlast vorhanden ist. **Ihr Stromverbrauch ist für diese
Entscheidung fast irrelevant** — die Verschattung und die Montageart sind es
nicht.

---

## 7. Annahmen und Methodik

### Ertragsmodell
- Referenz München, Süd, ca. 35° Neigung, unverschattet: **1.120 kWh/kWp/a**
  (inkl. 14 % Systemverluste: Wechselrichter, Kabel, Temperatur, Verschmutzung)
- Ertragsfaktoren: senkrecht 90° = 0,70 · 20° = 0,94 · 30° = 0,99
- Modul-Degradation 0,4–0,6 % pro Jahr
- Monatsprofile getrennt für senkrechte und aufgeständerte Montage

### Verbrauchs- und Speichermodell
Statt einer pauschalen Eigenverbrauchsquote rechnet das Modell **stündlich**:
für jeden Monat drei repräsentative Tagtypen (30 % sonnig mit doppeltem Ertrag,
40 % mittel, 30 % trüb mit einem Drittel), je 24 Stunden mit
H0-ähnlichem Haushaltslastprofil. Dispatch-Reihenfolge: Direktverbrauch →
Speicher laden → Rest ins Netz; abends Speicher entladen. Zusätzlich ein
Untertages-Gleichzeitigkeitsfaktor (0,60–0,80), weil kurze Lastspitzen
(Wasserkocher, Herd) und Erzeugungslücken innerhalb einer Stunde nicht
zusammenfallen.

- Nutzbare Kapazität 95 % der Nennkapazität
- Round-Trip-Wirkungsgrad 80–90 % (Tests messen ca. 80 % für die Ultra X)
- Kapazitätsverlust 1,0–2,5 % pro Jahr
- AC-Begrenzung 800 W (deutsche Regelung für steckerfertige Anlagen)

### Bewertung
Bewertet wird nicht die „selbst genutzte" Energie, sondern der **tatsächlich
vermiedene Netzbezug**: `Ersparnis = Eigenverbrauch − Standby`. Das Standby ist
eine zusätzliche Last, die es ohne das Gerät nicht gäbe — sie wird also
vollständig gegengerechnet.

### Einspeisevergütung
**Mit 0 ct/kWh angesetzt.** Für steckerfertige Anlagen gibt es zwar formal einen
EEG-Anspruch (2026 ca. 7,8 ct/kWh), praktisch lohnt die Anmeldung als
EEG-Anlage nicht: Die Kosten für den Zweirichtungszähler (ca. 20–25 €/Jahr)
übersteigen den Erlös. Bei 0–24 kWh Überschuss pro Jahr wären das ohnehin
maximal 2 €. Zu beachten: Die aktuelle EEG-Regelung läuft **Ende 2026** aus, ab
Januar 2027 gilt ein neues Gesetz — das ändert an dieser Rechnung aber nichts,
weil hier keine Vergütung eingerechnet ist.

### Kosten
- Set 840,65 € (Angebotspreis)
- **Halterung 90–180 € — im Set nicht enthalten**, muss separat gekauft werden
- Betriebskosten 0–10 €/Jahr (Reinigung; Versicherung läuft in der Regel über
  die bestehende Hausrat-/Haftpflichtversicherung mit)
- Anmeldung im Marktstammdatenregister: kostenlos, Pflicht innerhalb eines Monats
- Kalkulationszins 1–3 % (Opportunitätskosten Tagesgeld)

---

## 8. Wichtige nicht-monetäre Punkte

1. **Vermieterzustimmung.** Seit der Reform des Mietrechts (§ 554 BGB) ist die
   Steckersolaranlage eine privilegierte Maßnahme — der Vermieter bzw. die WEG
   darf sie nur aus wichtigem Grund verweigern. Die Zustimmung muss aber
   trotzdem eingeholt werden, insbesondere zur Art der Befestigung.
2. **Aufständerung vs. Optik.** Der größte selbst steuerbare Hebel ist die
   Neigung (+34 % Ertrag bei 20°, Amortisation 3,7 → 2,8 Jahre). Ob eine Aufständerung
   über das Geländer hinaus genehmigt wird, ist in einem Münchner Mehrfamilienhaus
   die entscheidende offene Frage. Alternative: Aufständerung **auf** dem
   Balkonboden statt über dem Geländer — optisch unauffälliger, ertraglich fast
   gleichwertig.
3. **Gewicht.** 23,5 kg pro Modul, zwei Module = 47 kg plus Halterung.
   Bei Geländermontage im 1. OG unbedingt auf die Statik des Geländers achten
   und Absturzsicherung vorsehen. Die Montage ist laut Hersteller mit zwei
   Personen durchzuführen.
4. **Windlast.** Im 1. OG geringer als in oberen Etagen, aber eine
   Aufständerung wirkt als Segel. Sturmsichere Befestigung ist Pflicht.
5. **Bäume.** Die Verschattung ist der größte Unsicherheitsfaktor der ganzen
   Rechnung (Spanne 1.425 € bis 3.214 € NPV). Empfehlenswert: vor dem Kauf über
   einige sonnige Tage hinweg fotografisch dokumentieren, wann die Balkonbrüstung
   in der Sonne liegt. Laubbäume verschatten von Mai bis Oktober, im Winter
   deutlich weniger — das passt günstig zum flachen Ertragsprofil der
   senkrechten Montage.

---

## 9. Empfehlung

**Die Anlage lohnt sich — unter drei Bedingungen:**

1. **FKG-Antrag vor der Bestellung stellen.** 320 € entscheiden über
   3,7 vs. 5,4 Jahre Amortisation.
2. **Nicht senkrecht montieren, wenn eine Aufständerung möglich ist.**
   Schon 20° Neigung bringen +34 % Ertrag und ein um rund 1.000 € besseres
   Ergebnis über 20 Jahre.
3. **Die kleine Batterie (1,92 kWh) nehmen, nicht die Ultra X.** Der Aufpreis
   für 3,84 kWh amortisiert sich in keinem Szenario.

**Ehrliche Einschränkung:** Der Speicher selbst ist bei 1 kWp betriebswirtschaftlich
grenzwertig (Amortisation des Aufpreises 10–30+ Jahre, im Worst Case nie). Wer
rein auf Rendite optimiert, fährt mit **2 Modulen + reinem 800-W-Mikrowechselrichter
für ca. 320 €** besser: gleiche Erzeugung, 81 % statt 98 % Eigenverbrauchsquote,
aber nur ein Drittel der Investition und kein Standby-Verlust. Der Speicher kauft
Ihnen Notstromfähigkeit, App-Komfort und Erweiterbarkeit — das sind reale, aber
nicht-monetäre Werte.

Wenn die Anlage später um weitere Module erweitert werden soll (der STREAM Ultra
verträgt bis 2.000 W Solareingang), dreht sich die Bewertung: Ab etwa 1,6–2 kWp
fällt genug Überschuss an, dass der Speicher sich klar rechnet. Unter diesem
Gesichtspunkt ist das Set eine sinnvolle Ausbaustufe.

---

## 10. Dateien

| Datei | Inhalt |
|---|---|
| `wirtschaftlichkeit.py` | Vollständiges Rechenmodell, reine Standardbibliothek |
| `cashflow_worst.csv` | Jahresweise Cashflows Worst Case (Semikolon-getrennt) |
| `cashflow_normal.csv` | Jahresweise Cashflows Normal Case |
| `cashflow_best.csv` | Jahresweise Cashflows Best Case |
| `ergebnis_uebersicht.json` | Alle Kennzahlen, Sensitivitäten, Speichervergleich |

Eigene Zahlen einsetzen: In `wirtschaftlichkeit.py` die Szenarien ab
Abschnitt 5 anpassen (z. B. `consumption_kwh`, `price_ct`, `shading_factor`)
und `python3 wirtschaftlichkeit.py` erneut ausführen.

---

## Quellen

- [SWM Preisanpassung / Grundversorgung München](https://www.swm.de/strom/preisanpassung) — Arbeitspreis 32,44 ct/kWh brutto (gültig ab 01.02.2026)
- [Balkonkraftwerk-Förderung München (FKG), 0,40 €/Wp bis 320 €](https://yuma.de/blogs/news/balkonkraftwerk-forderung-in-munchen-dein-guide-zum-320-euro-zuschuss)
- [Förderprogramm Klimaneutrale Gebäude — Übersicht](https://elektronik-zeit.de/balkonkraftwerk/foerderkarte/bundeslaender/muenchen/)
- [SWM: Steckerfertige PV-Anlagen in München](https://www.swm.de/unternehmen/magazin/ratgeber/steckerfertige-pv-anlage)
- [Ertragsverlust bei senkrechter Montage (ca. 68–70 % des Maximums)](https://www.balkonkraftwerk-kompendium.de/montage-aufstellorte/ausrichtung-neigungswinkel)
- [Neigungswinkel Balkonkraftwerk](https://kleineskraftwerk.de/blogs/magazin/neigungswinkel-balkonkraftwerk)
- [EcoFlow STREAM Ultra X im Test — Round-Trip ca. 80 %, Standby, 10 Jahre Garantie](https://www.smartzone.de/ecoflow-stream-ultra-x-im-test-xxl-speicher-fuer-balkonkraftwerke/)
- [EcoFlow STREAM Ultra / PowerStream Test 2026](https://solarmars.de/blogs/blog/ecoflow-stream-ultra-test-2026)
- [Einspeisevergütung Balkonkraftwerk 2026 — praktische Einordnung](https://www.t-online.de/finanzen/frag-t-online-ihr-geld/id_101275292/einspeiseverguetung-wird-abgeschafft-trifft-es-balkon-kraftwerke-.html)
- [Strompreisentwicklung Deutschland 2026](https://strom-report.com/strompreisentwicklung/)
- [Angebot Svea Solar — EcoFlow STREAM Komplettset M](https://shop.sveasolar.de/product-page/stream-komplettset-m)
