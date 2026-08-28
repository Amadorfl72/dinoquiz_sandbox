# Créditos y atribución — DinoQuiz

Este fichero es el índice raíz de atribución del proyecto. Las licencias de
imágenes y otros assets binarios viven en el `CREDITS.md` de su propia
carpeta (uno por concepto, junto al asset que documentan):

- [`public/assets/images/dinosaurs/CREDITS.md`](public/assets/images/dinosaurs/CREDITS.md) —
  ilustraciones cartoon (obra original DinoQuiz).
- [`public/assets/images/realistic/CREDITS.md`](public/assets/images/realistic/CREDITS.md) —
  paleoarte realista (Wikimedia Commons, licencia libre por fichero).
- [`public/assets/images/fallback/CREDITS.md`](public/assets/images/fallback/CREDITS.md) —
  siluetas de respaldo (obra original DinoQuiz).
- [`public/assets/images/cards/CREDITS.md`](public/assets/images/cards/CREDITS.md) —
  cartas del modo "Parejas jurásicas" (obra original DinoQuiz).
- [`public/assets/images/modes/CREDITS.md`](public/assets/images/modes/CREDITS.md) —
  iconos del selector de modos (obra original DinoQuiz).

## Fuentes institucionales del catálogo de criaturas

[`public/data/creatures.json`](public/data/creatures.json) — la ficha única y
verificable de cada criatura jugable (ver la sección "Catálogo único de
criaturas" en [`README.md`](README.md)) — declara, por criatura, en qué
institución científica o museística se ha verificado su ficha
(dieta, longitud, periodo/intervalo temporal, hábitat y clasificación) bajo
el campo `fuentes`. Esta tabla recoge, sin duplicar el JSON, cada fuente
citada, para qué criaturas se ha usado y su URL de referencia:

| Fuente | URL | Criaturas verificadas |
|---|---|---|
| American Museum of Natural History (AMNH) | https://www.amnh.org/ | Tyrannosaurus Rex (`trex`), Ankylosaurus (`ankylosaurus`), Spinosaurus (`spinosaurus`), Parasaurolophus (`parasaurolophus`) |
| Natural History Museum, Londres | https://www.nhm.ac.uk/ | Triceratops (`triceratops`), Estegosaurio (`estegosaurio`), Compsognathus (`compsognathus`), Iguanodon (`iguanodon`) |
| Smithsonian National Museum of Natural History | https://naturalhistory.si.edu/ | Velociraptor (`velociraptor`), Pteranodon (`pteranodon`), Dilophosaurus (`dilophosaurus`), Pachycephalosaurus (`pachycephalosaurus`) |
| Field Museum, Chicago | https://www.fieldmuseum.org/ | Braquiosaurio (`braquiosaurio`), Diplodocus (`diplodocus`) |

Ninguna de estas cuatro instituciones exige atribución contractual para citar
sus fichas educativas públicas (no son obra con copyright redistribuida,
como sí lo es el paleoarte de `realistic/`): se listan aquí por trazabilidad
y verificabilidad del contenido científico (PRD G4 — "evitar afirmaciones
científicas falsas"), no por un requisito de licencia. Añadir una criatura
nueva a `creatures.json` con una fuente que no esté en esta tabla debe venir
acompañado de actualizar esta tabla en la misma PR.
