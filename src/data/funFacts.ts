export interface FunFact {
  id: string;
  dinosaur: string;
  text: string;
}

// Catalog of curious facts shown during/after a quiz. The total count drives
// the "descubiertos X/Y" progress indicator, so it must stay a plain array
// (no hidden entries) rather than a hardcoded number kept elsewhere.
export const FUN_FACTS: FunFact[] = [
  { id: 'trex-teeth', dinosaur: 'Tiranosaurio Rex', text: '¡El T-Rex tenía dientes tan grandes como un plátano!' },
  { id: 'triceratops-horns', dinosaur: 'Triceratops', text: 'El Triceratops usaba sus tres cuernos para protegerse de otros dinosaurios.' },
  { id: 'velociraptor-size', dinosaur: 'Velociraptor', text: 'El Velociraptor era del tamaño de un pavo, ¡mucho más pequeño de lo que muestran las películas!' },
  { id: 'stegosaurus-plates', dinosaur: 'Stegosaurus', text: 'Las placas del Stegosaurus le ayudaban a controlar su temperatura corporal.' },
  { id: 'brachiosaurus-neck', dinosaur: 'Brachiosaurus', text: 'El Brachiosaurus tenía un cuello tan largo que podía comer hojas de los árboles más altos.' },
  { id: 'ankylosaurus-tail', dinosaur: 'Ankylosaurus', text: 'La cola del Ankylosaurus terminaba en una bola de hueso, ¡como un mazo!' },
  { id: 'spinosaurus-swim', dinosaur: 'Spinosaurus', text: 'El Spinosaurus es el único dinosaurio conocido que sabía nadar muy bien.' },
  { id: 'pteranodon-flight', dinosaur: 'Pteranodon', text: 'El Pteranodon no era un dinosaurio, ¡era un reptil volador!' },
  { id: 'diplodocus-length', dinosaur: 'Diplodocus', text: 'El Diplodocus podía medir tanto como tres autobuses puestos uno detrás de otro.' },
  { id: 'parasaurolophus-crest', dinosaur: 'Parasaurolophus', text: 'La cresta del Parasaurolophus le servía para hacer sonidos como una trompeta.' },
  { id: 'iguanodon-thumb', dinosaur: 'Iguanodon', text: 'El Iguanodon tenía un pulgar puntiagudo que usaba como si fuera una espina para defenderse.' },
  { id: 'allosaurus-hunter', dinosaur: 'Allosaurus', text: 'El Allosaurus era uno de los cazadores más rápidos de su época.' },
];
