/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

describe('UI Components with Real Content', () => {
  describe('Button Component', () => {
    it('renders functional data and handles interaction without mocks', async () => {
      const realFunctionData = { text: 'Save Details', value: 42 };
      const handleClick = jest.fn();

      render(<Button onClick={handleClick}>{realFunctionData.text}</Button>);
      
      const button = screen.getByRole('button', { name: /save details/i });
      expect(button).toBeInTheDocument();
      
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders correctly as a variant with disabled state', () => {
      render(<Button variant="destructive" disabled>Delete</Button>);
      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toBeDisabled();
      expect(button).toHaveClass('bg-destructive');
    });
  });

  describe('Card Component', () => {
    it('structures real data content accurately', () => {
      const actualDataNode = { title: 'Project Overview', description: 'Active phase', metadata: '10 commits' };
      render(
        <Card>
          <CardHeader>
            <CardTitle>{actualDataNode.title}</CardTitle>
            <CardDescription>{actualDataNode.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{actualDataNode.metadata}</p>
          </CardContent>
          <CardFooter>
            <Button>Action</Button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Project Overview')).toBeInTheDocument();
      expect(screen.getByText('Active phase')).toBeInTheDocument();
      expect(screen.getByText('10 commits')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('Badge Component', () => {
    it('renders with appropriate data states', () => {
      render(
        <div>
          <Badge variant="default">Primary Tag</Badge>
          <Badge variant="secondary">Secondary Tag</Badge>
          <Badge variant="outline">Outline Tag</Badge>
        </div>
      );

      expect(screen.getByText('Primary Tag')).toBeInTheDocument();
      expect(screen.getByText('Secondary Tag')).toBeInTheDocument();
      expect(screen.getByText('Outline Tag')).toBeInTheDocument();
    });
  });
});
