# kafelkorz — plan MVP

Kafelkorz to polski planer płytek na telefon i komputer. Użytkownik wpisuje wymiary ściany lub podłogi, przesuwa siatkę i od razu widzi wymiary docinek oraz położenie otworów. Gotowy układ pobiera jako PDF A4.

Pojęcia używane w edytorze i na wydruku opisuje [słownik](../../GLOSSARY.md). Granicę między projektem a sposobem jego przechowywania opisuje [ADR 0001](../adr/0001-oddzielenie-zapisu-projektu.md).

## Pierwsze wejście i projekty

- Przy pierwszej wizycie otwiera się edytowalna kopia przykładu **Ściana łazienkowa**. Krótka informacja mówi, że można zmienić ten układ albo wybrać **Nowy projekt**.
- **Nowy projekt** pozwala zacząć od pustego układu albo wczytać przykład jako osobny projekt. Przykłady używają wymyślonych wymiarów i neutralnej tekstury. Ściana ma drzwi, puszkę i docinkę L. Podłoga ma okrągły otwór przy krawędzi i docinki przy ścianach.
- Przycisk **Projekty** otwiera listę zapisanych projektów. Można je otwierać, zmieniać ich nazwy i usuwać po potwierdzeniu. Każdy projekt zachowuje własne powierzchnie, tekstury i ustawienia. Edycja kopii przykładu pozostawia przykład dostępny w pierwotnej postaci.
- Zmiany zapisują się automatycznie w przeglądarce, razem z teksturami. Po ponownym wejściu aplikacja otwiera ostatni projekt. Gdy lista jest pusta po usunięciu projektów, użytkownik może stworzyć projekt albo wybrać przykład z ekranu startowego.

## Powierzchnia i otwory

Projekt może mieć kilka nazwanych, prostokątnych powierzchni. Ścianę i podłogę edytuje się w ten sam sposób. Każda powierzchnia ma własne wymiary, otwory, płytkę i siatkę.

Otwór oznacza miejsce pozostawione bez okładziny. Można dodać kilka otworów, przesuwać je, zmieniać ich rozmiar i usuwać. Otwór może leżeć wewnątrz powierzchni lub dochodzić do krawędzi.

| Kształt | Wymiar i położenie | Przykłady |
| --- | --- | --- |
| Prostokąt | Szerokość, wysokość i położenie lewego dolnego narożnika | Drzwi, okno, wycięcie przy krawędzi |
| Koło | Średnica i położenie środka | Puszka, rura, odpływ |

Uchwyty służą do szybkiego ustawienia otworu. Pola liczbowe pozwalają doprecyzować położenie i wymiary. Wpisane wymiary określają gotowe wycięcie. Jeśli przy rurze Ø40 mm potrzebny jest otwór Ø44 mm, użytkownik wpisuje Ø44 mm.

Każdy otwór może mieć nazwę, np. „Zimna woda”. W widoku technicznym i PDF nazwa pojawia się przy otworze. Jeśli brakuje miejsca, rysunek pokazuje numer, a legenda zawiera nazwę i wymiar.

## Płytka, siatka i docinki

- Użytkownik podaje rzeczywisty format prostokątnej płytki i wybiera orientację poziomą lub pionową. Wymiary powierzchni, płytki i otworów można podać w mm lub cm. Pola przyjmują przecinek dziesiętny. Fuga i osobna szczelina obwodowa są podawane w mm. Fuga może mieć szerokość 0 mm.
- Każda powierzchnia ma jedną regularną siatkę. Użytkownik przeciąga ją myszką lub palcem albo ustawia punkt startowy w polach liczbowych. Punkt startowy to oznaczony lewy dolny narożnik wskazanej płytki. Odległości mierzy się od lewej i dolnej krawędzi powierzchni.
- Podczas przesuwania siatki otwory zachowują położenie. Wymiary docinek zmieniają się na żywo. Na telefonie przesunięcie widoku, przesunięcie siatki i edycja otworu są rozróżnialnymi czynnościami. Pola liczbowe pozwalają pracować bez gestów.
- Rysunek pokazuje szerokość i wysokość prostokątnej docinki oraz wymiary wycięcia w docince L. Dla koła mieszczącego się w jednej płytce podaje średnicę i odległości środka od krawędzi tej płytki. Przy przecięciu fugi wskazuje wszystkie płytki, w których trzeba wykonać cięcie.
- Użytkownik może wgrać zdjęcie płytki, wykadrować wzór i przełączać się między podglądem z teksturą a widokiem technicznym. Oba widoki zachowują położenie fug, otworów i docinek. Zdjęcia są przetwarzane lokalnie.

### Podział docinki L

Po wskazaniu docinki L aplikacja pokazuje możliwe podziały poziome i pionowe. Każdy wariant pokazuje położenie dodatkowej fugi oraz wymiary obu prostokątów przed zatwierdzeniem. Wariant jest dostępny, jeśli oba prostokąty mają dodatnie wymiary. Dodatkowa fuga ma ustawioną szerokość fugi powierzchni, także przy wartości 0 mm. Pozostałe płytki zachowują położenie.

Zatwierdzony podział pojawia się w obu widokach i PDF oraz wraca po ponownym otwarciu projektu. Po zmianie geometrii podział zostaje, jeśli ta sama docinka zachowała obrys i nadal daje dwa prostokąty. Jeśli przestaje pasować, aplikacja informuje o tym po zatwierdzeniu edycji. **Cofnij zmianę** przywraca poprzednią geometrię razem z podziałem.

## PDF A4

**Pobierz PDF** zapisuje układ widoczny w chwili eksportu. Każda powierzchnia ma jedną stronę rysunku z obrysem, siatką, otworami, wymiarami, formatem i orientacją płytki, szerokością fugi i szczeliny obwodowej oraz oznaczonym punktem startowym. Eksport obejmuje zatwierdzone podziały i nazwy otworów. Gdy wymiary przy gęstym układzie byłyby nieczytelne, rysunek używa oznaczeń docinek, a wykaz trafia na dodatkową stronę. Teksturę można wyłączyć do druku.

## Kolejność realizacji

1. **Geometria.** Przeliczaj jednostki do mm. Wyznaczaj skok siatki jako wymiar zorientowanej płytki plus fuga. Przycinaj płytki do powierzchni z uwzględnieniem szczeliny obwodowej i sumy otworów. Sam styk z otworem bez ubytku powierzchni nie wymaga cięcia. Zwracaj wszystkie powstałe kawałki, również gdy jeden otwór rozdziela płytkę na dwie części.
2. **Edytor.** Dodaj powierzchnie, otwory, przesuwanie siatki, podgląd podziałów L i cofnięcie zmiany unieważniającej podział. Obliczaj geometrię i wymiary raz dla widoku technicznego, podglądu tekstury i PDF. Powiększenie zmienia sposób prezentacji, a edycja wymiarów zmienia projekt.
3. **Projekty i tekstury.** Dodaj lokalne przetwarzanie zdjęć, automatyczny zapis, listę projektów i przykłady. Wersjonowany zapis przechowuje parametry projektu, otwory, podziały i odwołania do tekstur. Edytor korzysta z kontraktu dostępu po ID opisanego w ADR-ze.
4. **PDF i publikacja.** Wyeksportuj wspólny rysunek z czytelnymi polskimi etykietami. Sprawdź pełny przepływ na komputerze, w Safari na iPhonie i w Chrome na Androidzie. Opublikuj stronę pod uzgodnionym adresem. Stos i interfejsy modułów opisuje [architektura MVP](../architecture.md).

## Scenariusze odbioru

| Scenariusz | Oczekiwany wynik |
| --- | --- |
| Pierwsza wizyta i powrót | Otwiera się kopia ściany łazienkowej. Po edycji i odświeżeniu wracają zmiany. Po otwarciu drugiego projektu aplikacja wraca do niego przy następnej wizycie. |
| Wiele projektów i przykłady | Otwórz dwa projekty z różnymi teksturami. Zmiana nazwy i układu jednego zachowuje dane drugiego. Ponowne wczytanie przykładu daje jego oryginalny układ w osobnym projekcie. Usunięcie wymaga potwierdzenia. |
| Otwory i przesuwanie | Zmień wymiary okna i położenie okrągłej puszki. Przesuń siatkę dotykiem i odtwórz położenie liczbowo. Otwory zostają na miejscu, a docinka pojawia się, gdy otwór usuwa część płytki. Sprawdź też otwór na krawędzi, nachodzące otwory, obrót płytki i fugę 0 mm. |
| Podział L | Wybierz poprawny podział przy fugach 3 mm i 0 mm. W obu przypadkach powstają dwa prostokąty. Odświeżenie zachowuje podział. Przesunięcie zmieniające obrys pokazuje informację, a cofnięcie odtwarza oryginalny obrys i podział. |
| PDF | Wyeksportuj projekt z dwiema powierzchniami oraz układ z gęstymi docinkami. Wymiary, etykiety, oznaczenia i podziały zgadzają się z widokiem technicznym. Wydruk A4 jest czytelny także po wyłączeniu tekstury. |

### Przypadek z łazienki

Ściana ma **2709 × 2455 mm**. Drzwi **900 × 2110 mm** zaczynają się **219 mm** od lewej krawędzi, po prawej zostaje **1590 mm**. Ustaw poziomą płytkę **597 × 297 mm**, fugę i szczelinę obwodową po **3 mm** oraz punkt startowy **1122 mm od lewej i 138 mm od dołu**. Po prawej dolna docinka ma **132 mm** wysokości, a prawa docinka **384 mm** szerokości.

Płytka z przyłączami zaczyna się **603 mm od prawej futryny** i **438 mm nad podłogą**. Współrzędne centrów otworów w mm, mierzone od prawej futryny i podłogi, to **(775, 625)**, **(865, 620)** i **(820, 505)**. Przy testowych średnicach **30, 30 i 50 mm** wszystkie trzy koła mieszczą się w tym samym elemencie. Środki są przybliżone, a średnice służą do testu układu. Ten przypadek nie jest publicznym przykładem.

## Po MVP

- Konta i synchronizacja projektów z teksturami między urządzeniami.
- Pomiar korzystania z aplikacji, prowadzony osobno od synchronizacji.
- Dodatkowe kształty otworów i powierzchnie połączone narożnikami.
- Wizualizacja na zdjęciu pomieszczenia. Aplikacja dopasuje zapisaną siatkę do perspektywy zdjęcia, a AI pomoże pokazać fakturę i oświetlenie.
