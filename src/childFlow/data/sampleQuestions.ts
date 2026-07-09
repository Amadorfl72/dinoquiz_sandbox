export type SampleQuestion = {
  id: string;
  prompt: string;
  dinosaurName: string;
  dinosaurImageSrc: string;
  funFact: string;
  correctOptionId: string;
  options: { id: string; text: string }[];
};

export const sampleQuestions: SampleQuestion[] = [
  {
    id: 'q1',
    prompt: '¿Que dinosaurio tenia tres cuernos en la cara?',
    dinosaurName: 'Triceratops',
    dinosaurImageSrc: '/assets/dinosaurs/triceratops.png',
    funFact: 'El Triceratops usaba sus cuernos para protegerse de los depredadores.',
    correctOptionId: 'triceratops',
    options: [
      { id: 'triceratops', text: 'Triceratops' },
      { id: 'trex', text: 'T-Rex' },
      { id: 'pteranodon', text: 'Pteranodon' },
    ],
  },
  {
    id: 'q2',
    prompt: '¿Que dinosaurio era un gran cazador con dientes afilados?',
    dinosaurName: 'T-Rex',
    dinosaurImageSrc: '/assets/dinosaurs/trex.png',
    funFact: 'El T-Rex tenia una de las mordidas mas fuertes de la historia.',
    correctOptionId: 'trex',
    options: [
      { id: 'trex', text: 'T-Rex' },
      { id: 'estegosaurio', text: 'Estegosaurio' },
      { id: 'ankylosaurus', text: 'Ankylosaurus' },
    ],
  },
  {
    id: 'q3',
    prompt: '¿Que dinosaurio podia volar sobre los oceanos?',
    dinosaurName: 'Pteranodon',
    dinosaurImageSrc: '/assets/dinosaurs/pteranodon.png',
    funFact: 'El Pteranodon no era tecnicamente un dinosaurio, sino un reptil volador.',
    correctOptionId: 'pteranodon',
    options: [
      { id: 'pteranodon', text: 'Pteranodon' },
      { id: 'braquiosaurio', text: 'Braquiosaurio' },
      { id: 'velociraptor', text: 'Velociraptor' },
    ],
  },
];
