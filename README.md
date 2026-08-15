# Balkonkraftwerk-Rechner

Interaktiver Wirtschaftlichkeitsrechner für Balkonkraftwerke mit Speicher.
Ausgangsfall: EcoFlow STREAM Komplettset M an einem Südbalkon in der
Zaubzerstraße 37, 81677 München, 1. Obergeschoss, mit Baumverschattung.

Alle Parameter sind frei einstellbar — Modulanzahl und -leistung, Neigung und
Ausrichtung, Verschattung, Speichergröße, Lastprofil, Strompreis und sämtliche
Kostenpositionen. Das Ergebnis rechnet bei jeder Reglerbewegung neu.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm run build    # Typprüfung und Produktionsbuild nach dist/
npm run preview  # Produktionsbuild lokal testen
npm run check    # Modell gegen Presets und Randfälle prüfen
```

## Deployment auf Vercel

Das Projekt ist ein Vite-Standardprojekt und wird von Vercel ohne weitere
Einstellungen erkannt:

- **Framework Preset:** Vite (steht auch in `vercel.json`)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node:** 18 oder neuer

Import über <https://vercel.com/new>, Repository auswählen, deployen. Es sind
keine Umgebungsvariablen, keine Serverfunktionen und keine externen Dienste
nötig — die Seite ist vollständig statisch, die gesamte Simulation läuft im
Browser.

Alternativ per CLI:

```bash
npx vercel --prod
```

Der ausführliche Bericht zur Ausgangslage liegt als statische Seite unter
`/bericht.html` und wird mit ausgeliefert.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/model/solar.ts` | Einstrahlung auf die Modulebene für beliebige Neigung und Ausrichtung |
| `src/model/system.ts` | Stündliche Erzeugungs-, Last- und Speichersimulation |
| `src/model/finance.ts` | Kapitalwert, interner Zinsfuß, Amortisation, Stromgestehungskosten |
| `src/model/defaults.ts` | Ausgangslage und Vergleichsszenarien |
| `src/components/` | Diagramme und Bedienelemente, reines SVG ohne Chart-Bibliothek |
| `analyse/` | Ursprüngliche Rechnung in Python, Cashflow-Tabellen, Langbericht |
| `public/bericht.html` | Statischer Bericht zur Ausgangslage |

## Zum Modell

**Einstrahlung.** Statt fester Faktoren für ein paar Winkel wird die Einstrahlung
auf die Modulebene physikalisch transponiert (Hay & Davies, anisotroper Himmel)
aus der Globalstrahlung Münchens — rund 1.140 kWh/m² im Jahr auf der
Horizontalen. Neigung und Azimut wirken dadurch stetig. Der rein isotrope Ansatz
(Liu & Jordan) würde die Winkelabhängigkeit deutlich unterschätzen, weil in
München etwa die Hälfte der Einstrahlung diffus ist.

Kontrollwerte des Modells gegen die Literatur:

| Ausrichtung | Modell | Erwartung |
|---|---:|---:|
| Süd, 30–35° | 100 % | Optimum |
| Süd, 90° (senkrecht am Geländer) | 69 % | 68–70 % |
| Horizontal, 0° | 88 % | — |

**Verschattung** wird in drei Größen zerlegt: eine Hindernishöhe in Grad
(unterhalb dieser Sonnenhöhe blockieren Bäume oder Nachbarhäuser die
Direktstrahlung, es bleibt Diffuslicht), eine ganzjährige Grundverschattung und
eine zusätzliche Laubverschattung, die nur von Mai bis Oktober wirkt.

**Erzeugung und Verbrauch** werden stündlich über zwölf repräsentative Tage
simuliert, jeder aufgeteilt in sonnig, mittel und trüb. Diese Streuung ist
entscheidend: Ein Monatsmittelwert bügelt die Erzeugungsspitzen glatt und lässt
den Speicher systematisch zu gut aussehen. Die Last setzt sich aus einer
konstanten Grundlast und einem Tagesprofil zusammen.

**Bewertet** wird der tatsächlich vermiedene Netzbezug, nicht die „selbst
genutzte" Energie. Der Unterschied ist das Standby des Speichergeräts: Es läuft
rund um die Uhr und wäre ohne die Anlage nicht da, wird also voll
gegengerechnet. Bei kleinen Anlagen entscheidet dieser Posten spürbar mit.

**Grenzen.** Kein echtes Wetterjahr, keine geometrische Verschattungssimulation
einzelner Bäume, keine Modulverschaltung und keine Teilverschattungseffekte
innerhalb eines Strings. Die Ergebnisse taugen zum Vergleich von Varianten,
nicht als Ertragsgarantie.

## Kernbefunde für die Ausgangslage

- Die Anlage rechnet sich im realistischen Fall nach knapp vier Jahren.
- Der **Münchner FKG-Zuschuss** von 0,40 €/Wp (max. 320 €) ist der größte
  einzelne Hebel — der Antrag muss aber **vor** der Bestellung gestellt werden.
- Der **Speicher trägt sich bei 1 kWp kaum selbst**: Die Anlage erzeugt zu wenig
  Überschuss, um ihn zu füllen, und das Standby frisst den Zusatznutzen auf. Ab
  etwa 2 kWp dreht sich das — im Preset „Ausgebaut" nachvollziehbar.
- Die **Aufständerung** ist der größte selbst steuerbare Hebel, die
  **Baumverschattung** der größte nicht steuerbare.

Angaben ohne Gewähr.
