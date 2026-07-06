# Projekt „I Need You" – Handout für Claude Code

## 1. Projektvision & Zielsetzung

„I Need You" ist eine Community- und Event-Plattform (SaaS), die Menschen basierend auf gemeinsamen Interessen und ihrem aktuellen Standort zusammenbringt. Die App konzentriert sich auf die einfache Organisation von Gruppenaktivitäten (z. B. Sport, Wandern, Kochen) sowie auf spontane Einzelgesuche über ein „Schwarzes Brett". Der Fokus liegt auf einer minimalistischen, hochwertigen Benutzeroberfläche und hoher Privatsphäre.

## 2. Kernfunktionen des Minimum Viable Products (MVP)

### 2.1 Authentifizierung & Nutzerprofile

- Sichere Registrierung und Anmeldung (E-Mail & Passwort).
- Erfassung grundlegender Profildaten (Vorname, Geschlecht, Stadt).
- Datensparsamkeit: Öffentlich sichtbar sind stets nur der Vorname und die Stadt.

### 2.2 Gruppenmanagement & smarte Wartelisten

- Nutzer können Interessengruppen erstellen und verwalten.
- Wartelisten-Logik: Jede Gruppe hat eine definierte Maximalkapazität (`max_members`). Tritt ein neuer Nutzer über den Einladelink bei und die Gruppe ist voll, wird er automatisch auf die Warteliste gesetzt. Verlässt ein aktives Mitglied die Gruppe, kann über Push-Benachrichtigungen nachgerückt werden.
- **Wichtig:** Der Beitritt zur Gruppe muss über eine atomare Datenbankoperation (Postgres-Funktion mit Sperrmechanismus, z. B. `SELECT ... FOR UPDATE` oder äquivalent) abgesichert werden, damit `max_members` bei gleichzeitigen Beitritten nicht überschritten werden kann.
- Administratoren können Gruppen temporär für die Öffentlichkeit sichtbar machen (`is_public_event`).

### 2.3 Das Schwarze Brett & Umkreissuche

- Ein Feed für spontane Gesuche (z. B. „Wer geht heute Abend mit joggen?").
- PostGIS-Radius-Suche: Nutzer sehen nur Gesuche, die sich in ihrem definierten Umkreis (z. B. 5 km bis 50 km) befinden.
- Harte Filterung: Inserate können gezielt für bestimmte Zielgruppen (z. B. nach Geschlecht) freigegeben werden. Nicht berechtigte Personen sehen diese Posts gar nicht erst.
- **Privatsphäre-Hinweis:** Für Standortabfragen soll nicht die exakte GPS-Position dauerhaft gespeichert werden, sondern eine bewusst ungenaue/verrauschte Koordinate bzw. ein grober Referenzpunkt, um Rückschlüsse auf den exakten Wohnort zu vermeiden.

### 2.4 Sicherheit & Moderation

- Shadow-Ban-System: Integrierter Report-Button für alle Posts und Profile. Gemeldete Inhalte werden für den meldenden Nutzer sofort unsichtbar, während ein Admin-Dashboard im Hintergrund zur Moderation dient.
- (Für spätere Phase vorgemerkt, nicht MVP: Nutzer-Verifizierung, da reale Treffen zwischen Fremden organisiert werden.)

## 3. Technischer Stack & Architektur

- **Frontend:** Vue.js (v3) in Kombination mit dem Quasar Framework für eine responsive Single Page Application (SPA). Von Anfang an so strukturiert, dass ein späterer Capacitor-Export (native iOS/Android) ohne Code-Neuschrieb möglich ist. Design: Dark Mode, minimalistische „Apple-Ästhetik", UI wird von Grund auf entwickelt (keine bestehenden Mockups).
- **Backend & Datenbank:** Supabase als Backend-as-a-Service (BaaS). Neues Supabase-Projekt (noch nicht angelegt). Vollwertige PostgreSQL-Datenbank mit Row-Level-Security (RLS).
- **Geodaten-Verarbeitung:** PostgreSQL-Erweiterung PostGIS für umkreisbasierte Standortabfragen.
- **Schnittstellen:** REST-API und Realtime-WebSockets über das Supabase Client SDK.
- **Push-Benachrichtigungen:** OneSignal (kostenloser Tier ausreichend für MVP, funktioniert für Web-Push und später nahtlos für natives Mobile-Push via Capacitor-Plugin).
- **Versionierung/Team:** GitHub-Repository, Zusammenarbeit mit einem weiteren Entwickler. Branch-Schutz auf `main`, Änderungen laufen über Pull Requests.

## 4. Rahmenbedingungen

- Kein Zeitdruck – Umsetzung erfolgt schrittweise in klar abgegrenzten Phasen.
- Projektinhaber hat keine Programmierkenntnisse – Kommunikation mit Claude Code erfolgt in natürlicher Sprache, technische Erklärungen sollen laienverständlich sein.
- Monetarisierung/Abo-Logik ist für den MVP noch nicht final entschieden – vorerst kein Bezahl-Feature einbauen, Architektur aber nicht dagegen verbauen.

## 5. Geplante Phasenstruktur (MVP)

| Phase | Inhalt |
|---|---|
| 0 | Projekt-Setup: GitHub-Repo, Supabase-Projekt, Quasar-Grundgerüst, CLAUDE.md |
| 1 | Auth & Profile (Registrierung, Login, Vorname/Geschlecht/Stadt) |
| 2 | Datenmodell & RLS-Grundlagen (Tabellen, Row-Level-Security-Basis) |
| 3 | Gruppenmanagement + atomare Wartelisten-Logik |
| 4 | Schwarzes Brett + PostGIS-Umkreissuche + Zielgruppen-Filter |
| 5 | Sicherheit: Report-Button, Shadow-Ban, Admin-Dashboard |
| 6 | Push-Benachrichtigungen (OneSignal) |
| 7 | Feinschliff UI (Dark Mode, Apple-Ästhetik), Testing |
| 8 | Mobile-Export via Capacitor (spätere Phase) |
| 9 | Monetarisierung (spätere Phase, nach Entscheidung) |

## 6. Vorläufiges Datenmodell (grobe Übersicht, im Detail in Phase 2 auszuarbeiten)

- **profiles** – Nutzerprofil (Vorname, Geschlecht, Stadt, Standortpunkt, verknüpft mit Supabase Auth)
- **groups** – Gruppen (Name, Beschreibung, max_members, is_public_event, Ersteller)
- **group_members** – Zuordnung Nutzer ↔ Gruppe (Status: aktiv/Warteliste)
- **board_posts** – Schwarzes-Brett-Einträge (Text, Standort, Zielgruppen-Filter, Radius)
- **reports** – Meldungen zu Posts/Profilen (für Shadow-Ban-Logik)

## 7. Hinweise für Claude Code

- Bei jeder neuen Session zuerst dieses Handout sowie die spätere `CLAUDE.md` berücksichtigen.
- Vor jedem größeren Feature: kurz den Plan erklären, bevor Code geschrieben wird (Plan Mode nutzen).
- Datenbankänderungen (Schema, RLS-Policies) immer klar und in einfachen Worten zusammenfassen, da der Projektinhaber nicht programmiert.
- Sicherheitsrelevante Logik (RLS, Wartelisten-Atomarität, Sichtbarkeitsfilter) besonders sorgfältig und mit Erklärung umsetzen.
- Secrets/API-Keys niemals ins Repository committen (`.env`-Datei verwenden, in `.gitignore` aufnehmen).
