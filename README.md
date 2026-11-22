# kafelkorz

Polski planer płytek na ściany i podłogi. Narysuj powierzchnię i otwory, podaj format płytki, przesuń siatkę i sprawdź wymiary docinek. Gotowy układ możesz pobrać jako PDF A4.

## Uruchomienie lokalne

Wymagany Node.js 24. Jeśli używasz nvm, wersję ustawi `nvm use`.

```sh
npm ci
npm run dev
```

Otwórz adres podany przez Vite. Przy pierwszym wejściu planer pokazuje edytowalną ścianę z drzwiami i otworami. Przycisk **Nowy projekt** pozwala zacząć od pustego projektu lub wybrać przykład.

## Weryfikacja

```sh
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:e2e
npm run build
```

Testy Playwright obejmują Chromium na komputerze, profil iPhone w WebKit i profil Android w Chromium. `npm run preview` otwiera lokalny podgląd zbudowanego pakietu.

## Wdrożenie

Wdróż katalog `dist/` na statycznym hostingu z HTTPS. Przy budowaniu z repozytorium ustaw Node.js 24, komendę `npm run build` i katalog wyjściowy `dist`.

Projekty i tekstury są zapisywane w IndexedDB w danej przeglądarce i pod danym adresem. Serwer udostępnia pliki aplikacji. PDF można zachować jako dokument do druku.

[Plan MVP](docs/plans/2026-11-22-1048-feat-kafelkorz-mvp-plan.md) · [Architektura](docs/architecture.md)
