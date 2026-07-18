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

- **Phase 0 (Setup):** fertig. Quasar-Grundgerüst, Capacitor-Vorbereitung, GitHub-Repo, Supabase-Client (`src/boot/supabase.ts`, Env-Vars `QCLI_SUPABASE_URL` / `QCLI_SUPABASE_ANON_KEY`, siehe `.env.example`). Supabase-Projekt: `chdhkkgenxskblezfbrl`.
- **Phase 1 (Auth & Profile):** fertig, in `main`. Registrierung/Login/Profil (Dark Mode), Pinia auth-store, Router-Guard, `profiles`-Tabelle mit RLS + `public_profiles`-View. CSP in `index.html` erlaubt Supabase (`https://*.supabase.co wss://*.supabase.co`).
- **Phase 2 (Datenmodell & RLS):** fertig (Branch `feature/data-model`, PR offen). Migration `0002_data_model.sql`: Tabellen `groups`, `group_members`, `board_posts`, `reports` + PostGIS + `profiles.location`. RLS per curl verifiziert (Zielgruppen-Filter, Shadow-Ban, kein direkter Gruppen-Beitritt). Wichtig: Supabase erteilt neuen Tabellen/Views/**Funktionen** automatisch Rechte an `anon` — daher überall explizit `revoke ... from anon`.
- **Phase 3 (Gruppenmanagement + Warteliste):** fertig (Branch `feature/group-management`). Migration `0003_group_functions.sql`: `create_group`, `join_group` (atomar via `SELECT ... FOR UPDATE`), `leave_group` (auto-Nachrücken), `get_group_preview` (Einladelink-Vorschau) — alle `security definer`. Frontend: `groups-store`, Seiten unter `src/pages/groups/` (Liste, Erstellen, Detail, Beitreten via `/groups/join/:id`), „Gruppen"-Link in MainLayout. Einladelink = Gruppen-ID. Verifiziert inkl. Nebenläufigkeitstest (2 gleichzeitige Beitritte → `max_members` nie überschritten).
- **Konventionen bestätigt:** DB-Migrationen laufen manuell im Supabase-SQL-Editor (kein CLI). Schreibzugriffe auf `group_members` nur über die security-definer-RPCs (keine direkte Insert-Policy). Neue Seiten folgen dem Dark-Mode-Muster; Quasar-Plugins `Notify`/`Dialog` sind aktiv.
- **Phase 4 (Schwarzes Brett + Umkreissuche):** fertig (Branch `feature/board`). Migration `0004_board_functions.sql`: `set_my_location` + `create_board_post` (security definer, schreiben Geography via `ST_MakePoint`) und `board_feed(radius_km)` — **bewusst invoker (nicht security definer)**, damit die board_posts-RLS (Zielgruppe + Shadow-Ban) im Feed automatisch greift; fügt nur `ST_DWithin`-Abstandsfilter hinzu, Mittelpunkt = Profil-Standort des Suchenden. Geocoding über gebündelte Städte-Liste `src/data/german-cities.ts` (kein externer Dienst) + `CitySelect.vue` (Autocomplete), genutzt in Registrierung/Profil/Gesuch. `board-store`, Seiten `src/pages/board/`, „Brett"-Link. Verifiziert per curl (Umkreis, Zielgruppe im Feed, anonym gesperrt) + Browser. **Datenhinweis:** Profil-Stadt muss exakt einem Listeneintrag entsprechen (z. B. „Köln", nicht „Koeln"), sonst wird kein Standort gesetzt.
- **Konventionen bestätigt (ergänzt):** Geography-Spalten immer über RPCs mit `ST_MakePoint` setzen (nicht als Text via PostgREST). Radius ist reiner Query-Parameter, nie Teil der RLS. Der Umlaut-genaue Städte-Abgleich ist eine bekannte Grenze (nur gelistete Orte).
- **Phase 5 (Sicherheit & Moderation):** fertig (Branch `feature/moderation`). Migration `0005_moderation.sql`: `profiles.is_admin` / `is_banned`, `check` auf `reports.reason` (spam/belaestigung/unangemessen/sonstiges), `is_admin()`, **Ban-Trigger** `reject_if_banned()` auf `board_posts` + `group_members` (blockt gesperrte Konten auch bei direktem API-Zugriff), `admin_list_reports()` / `admin_delete_post()` / `ban_user()` (alle prüfen intern `is_admin()`; `ban_user` verbietet Selbst-/Admin-Sperre und löscht Inhalte des Gesperrten). Frontend: `moderation-store`, `ReportDialog.vue`, Melde-Menü in BoardPage, `src/pages/admin/AdminPage.vue`, `requiresAdmin`-Guard, „Moderation"-Link nur für Admins, Auto-Abmeldung gesperrter Konten (`bannedNotice`). Verifiziert per curl + Browser.
- **Admin setzen:** nur manuell per SQL — `update public.profiles set is_admin = true where id = '<uuid>';` (bewusst keine Selbstbedienung in der App). Entsperren aktuell ebenfalls nur per SQL (`is_banned = false`).
- **Wichtig (Dev-Modus):** E-Mail-Bestätigung ist in Supabase aktuell **ausgeschaltet** (erleichtert Testen) — vor dem Launch wieder einschalten. Dev-Server läuft auf **Port 9100**.
- **Nächste Schritte:** Phase 6 (Push via OneSignal — u. a. Benachrichtigung beim Nachrücken von der Warteliste), danach Phase 7 (UI-Feinschliff) und Phase 8 (Capacitor-Export).
