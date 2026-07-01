import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameFlow from '../GameFlow';
import * as api from '../../services/api';

jest.mock('../../services/api');

const mockQuestions = [
  { id: 1, question: 'Q1', options: ['A', 'B'], correctAnswer: 'A', funFact: 'Fact 1' },
  { id: 2, question: 'Q2', options: ['C', 'D'], correctAnswer: 'C', funFact: 'Fact 2' }
];

describe('TRIOFSND-28: GameFlow Fun Fact Integration', () => {
  beforeEach(() => {
    api.getQuestions.mockResolvedValue(mockQuestions);
  });

  const renderWithRouter = (initialRoute = '/game') => 
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <GameFlow />
      </MemoryRouter>
    );

  it('shows Fun Fact screen after correct answer and goes to next question', async () => {
    renderWithRouter();
    
    await waitFor(() => expect(screen.getByText('Q1')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('A'));
    
    expect(await screen.findByTestId('fun-fact-screen')).toBeInTheDocument();
    expect(screen.getByText('Fact 1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('next-button'));
    
    await waitFor(() => expect(screen.getByText('Q2')).toBeInTheDocument());
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
  });

  it('shows Fun Fact screen after incorrect answer and goes to next question', async () => {
    renderWithRouter();
    
    await waitFor(() => expect(screen.getByText('Q1')).toBeInTheDocument());
    
    fireEvent.click(screen.getByText('B'));
    
    expect(await screen.findByTestId('fun-fact-screen')).toBeInTheDocument();
    expect(screen.getByText('Fact 1')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('next-button'));
    
    await waitFor(() => expect(screen.getByText('Q2')).toBeInTheDocument());
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
  });

  it('routes to results screen after last question (correct)', async () => {
    renderWithRouter();
    
    await waitFor(() => expect(screen.getByText('Q1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(await screen.findByTestId('next-button'));
    
    await waitFor(() => expect(screen.getByText('Q2')).toBeInTheDocument());
    fireEvent.click(screen.getByText('C'));
    
    expect(await screen.findByTestId('fun-fact-screen')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('next-button'));
    
    await waitFor(() => expect(screen.getByTestId('results-screen')).toBeInTheDocument());
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
  });

  it('routes to results screen after last question (incorrect)', async () => {
    renderWithRouter();
    
    await waitFor(() => expect(screen.getByText('Q1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('B'));
    fireEvent.click(await screen.findByTestId('next-button'));
    
    await waitFor(() => expect(screen.getByText('Q2')).toBeInTheDocument());
    fireEvent.click(screen.getByText('D'));
    
    expect(await screen.findByTestId('fun-fact-screen')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('next-button'));
    
    await waitFor(() => expect(screen.getByTestId('results-screen')).toBeInTheDocument());
    expect(screen.queryByTestId('fun-fact-screen')).not.toBeInTheDocument();
  });
});