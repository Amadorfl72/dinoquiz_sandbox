import React, { useEffect } from 'react';
import { FunFact } from '../data/funFacts';
import { useProgress } from '../hooks/useProgress';

interface FunFactCardProps {
  fact: FunFact;
}

// Marks the fact as seen the moment it is displayed to the player, updating
// the persisted discovered set that ProgressIndicator reads from.
export function FunFactCard({ fact }: FunFactCardProps): JSX.Element {
  const { seeFact } = useProgress();

  useEffect(() => {
    seeFact(fact.id);
  }, [fact.id, seeFact]);

  return (
    <div className="fun-fact-card">
      <p className="fun-fact-card__dinosaur">{fact.dinosaur}</p>
      <p className="fun-fact-card__text">{fact.text}</p>
    </div>
  );
}
