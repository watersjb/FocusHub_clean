// src/components/GradeBreakdown/GradeBreakdown.tsx
import React from 'react';
import styles from './GradeBreakdown.module.css';

interface Props {
  score: number;
  letter: string;
  breakdown: string[];
}

export const GradeBreakdown: React.FC<Props> = ({ score, letter, breakdown }) => (
  <div className={styles.container}>
    <h2 className={styles.grade}>Today’s Grade: {letter} ({score}%)</h2>
    <ul className={styles.list}>
      {breakdown.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  </div>
);
