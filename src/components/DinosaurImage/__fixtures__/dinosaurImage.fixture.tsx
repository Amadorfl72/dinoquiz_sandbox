import React from 'react';
import { DinosaurImage } from '../DinosaurImage';

export const Default = () => (
  <DinosaurImage
    src="/images/dinosaur.png"
    alt="A friendly dinosaur"
    caption="Meet Rex the Dinosaur"
  />
);

export const WithCustomFallback = () => (
  <DinosaurImage
    src="/images/dinosaur.png"
    alt="A friendly dinosaur"
    caption="Meet Rex the Dinosaur"
    fallbackSrc="/images/custom-placeholder.png"
  />
);

export const BrokenImage = () => (
  <DinosaurImage
    src="/images/does-not-exist.png"
    alt="A friendly dinosaur"
    caption="Meet Rex the Dinosaur"
  />
);

export const WithOnErrorCallback = () => (
  <DinosaurImage
    src="/images/dinosaur.png"
    alt="A friendly dinosaur"
    caption="Meet Rex the Dinosaur"
    onError={() => console.log('Image failed to load')}
  />
);
