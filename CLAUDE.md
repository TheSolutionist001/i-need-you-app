# CLAUDE.md — "I Need You"

Diese Datei ist der technische Leitfaden für Claude Code in diesem Repository. Bei jeder neuen Session zuerst diese Datei sowie `handout-i-need-you.md` (vollständiger Projektbrief) berücksichtigen.

## 1. Projektübersicht

"I Need You" ist eine Community- und Event-Plattform (SaaS), die Menschen anhand gemeinsamer Interessen und Standort zusammenbringt. Zwei Kernbereiche:

- **Gruppen**: Organisierte Aktivitäten (Sport, Wandern, Kochen …) mit Kapazitätsgrenze und Warteliste.
- **Schwarzes Brett**: Spontane Einzelgesuche mit Umkreissuche (PostGIS) und Zielgruppen-Filterung.

Design: Dark Mode, minimalistische "Apple-Ästhetik", UI wird from scratch entwickelt (keine Mockups vorhanden). Hohe Priorität auf Privatsphäre (Datensparsamkeit, ungenaue Standortdaten) und Sicherheit (RLS, atomare Wartelisten-Logik, Shadow-Ban).

Der Projektinhaber programmiert nicht selbst — Erklärungen (besonders zu DB-Schema, RLS-Policies und sicherheitsrelevanter Logik) müssen laienverständlich sein. Vor größeren Features den Plan kurz erklären, bevor Code geschrieben wird.

Details zu Funktionsumfang, Datenmodell und Phasenplan: siehe `handout-i-need-you.md`.

## 2. Architekturentscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Frontend-Framework | Vue 3 + Quasar (App-Vite-Engine v3, `--engine vite-3`) | Einheitliche Codebasis für Web + späteren nativen Export |
| Sprache | TypeScript | Typsicherheit, bessere Wartbarkeit bei Zusammenarbeit im Team |
| Mobile-Export | Capacitor (Modus bereits initialisiert unter `src-capacitor/`, App-ID `com.solutionist.ineedyouapp`) | Kein Code-Neuschrieb für iOS/Android nötig; Plattformen (`android`/`ios`) werden erst in Phase 8 hinzugefügt |
| Backend | Supabase (BaaS) | Postgres + Auth + Realtime + Storage aus einer Hand, spart eigenes Backend |
| Datenbank | PostgreSQL mit Row-Level-Security (RLS) | Zugriffskontrolle direkt auf DB-Ebene statt nur in der App-Schicht |
| Geodaten | PostGIS-Erweiterung | Umkreissuche für Schwarzes Brett |
| Push-Notifications | OneSignal | Kostenloser Tier reicht für MVP, funktioniert web + später nativ via Capacitor-Plugin |
| Paketmanager | npm | Repository wurde mit npm gescaffoldet (`package-lock.json`) |
| Node-Version | ≥ 22.22.0 (installiert: 22.23.1) | Von `@quasar/app-vite` v3 vorausgesetzt |
| Versionierung | GitHub, Branch-Schutz auf `main`, Änderungen über Pull Requests | Zusammenarbeit mit zweitem Entwickler |
| Monetarisierung | Kein Bezahl-Feature im MVP, Architektur aber nicht dagegen verbauen | Entscheidung noch offen |

### Sicherheitskritische Logik (besondere Sorgfalt erforderlich)

- **Wartelisten-Atomarität**: Gruppenbeitritt muss über eine atomare DB-Operation abgesichert werden (Postgres-Funktion mit `SELECT ... FOR UPDATE` o. ä.), damit `max_members` bei gleichzeitigen Beitritten nicht überschritten wird.
- **RLS-Policies**: Jede neue Tabelle braucht durchdachte Row-Level-Security von Anfang an, nicht nachträglich.
- **Standortdaten**: Nie exakte GPS-Position dauerhaft speichern — bewusst ungenaue/verrauschte Koordinaten verwenden.
- **Sichtbarkeitsfilter**: Zielgruppen-gefilterte Posts dürfen für nicht berechtigte Nutzer serverseitig (nicht nur clientseitig) unsichtbar sein.
- **Secrets**: API-Keys/Secrets nie committen — ausschließlich über `.env` (siehe `.gitignore`, bereits konfiguriert).

## 3. Projektstruktur

```
i-need-you-app/
├── src/                  # Quasar/Vue-App
│   ├── boot/             # Boot-Files (z. B. später Supabase-Client-Init)
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── router/
│   └── css/
├── src-capacitor/        # Capacitor-Wrapper (eigenes package.json/node_modules)
├── public/
├── quasar.config.ts
└── handout-i-need-you.md # Vollständiger Projektbrief
```

## 4. Coding-Konventionen

- **Sprache im Code**: Englisch für Bezeichner (Variablen, Funktionen, Komponenten, DB-Spalten), Deutsch nur in User-facing Texten/Kommentaren, falls nötig.
- **Vue-Komponenten**: `<script setup lang="ts">`, Composition API. Keine Options-API in neuem Code.
- **Typisierung**: Kein `any` ohne triftigen Grund; Typen für Supabase-Tabellen aus dem generierten Schema ableiten, sobald das DB-Schema steht (Phase 2).
- **State-Management**: Bei Bedarf Pinia (bereits als mögliche Erweiterung in Quasar vorgesehen) — erst einführen, wenn tatsächlich globaler State gebraucht wird.
- **Styling**: Quasar-eigene Utility-Klassen/Components bevorzugen, Dark Mode als Standard-Theme. Kein zusätzliches CSS-Framework.
- **Datenbankzugriff**: Ausschließlich über das Supabase Client SDK; komplexe/sicherheitsrelevante Operationen (z. B. Wartelisten-Beitritt) als Postgres-Funktionen (RPC), nicht als mehrschrittige Client-Logik.
- **Commits/PRs**: Änderungen laufen über Pull Requests gegen `main` (Branch-Schutz). Aussagekräftige Commit-Messages auf Englisch oder Deutsch, konsistent halten.
- **Keine vorzeitige Abstraktion**: MVP-Fokus — nur bauen, was die aktuelle Phase erfordert (siehe Phasenplan im Handout).

## 5. Aktueller Stand

- Phase 0 (Projekt-Setup) fast fertig: Quasar-Grundgerüst inkl. TypeScript und Capacitor-Vorbereitung steht, GitHub-Repo verbunden, `@supabase/supabase-js` installiert und Boot-File (`src/boot/supabase.ts`) vorbereitet (nutzt Env-Vars `QCLI_SUPABASE_URL` / `QCLI_SUPABASE_ANON_KEY`, siehe `.env.example`).
- Supabase-Projekt selbst wurde noch **nicht** angelegt — sobald Projekt-URL und anon key vorliegen, `.env` aus `.env.example` befüllen (nie committen, ist bereits in `.gitignore`).
- Nächste Schritte laut Phasenplan: Supabase-Projekt-Zugangsdaten eintragen, dann Phase 1 (Auth & Profile).
