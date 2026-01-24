
"use client";

import * as React from 'react';
import type { Ticket, Contact } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';
import { TicketCard } from './ticket-card';

interface TimeframeViewProps {
  tickets: Ticket[];
  contacts: Contact[];
  onDelete: (id: string) => void;
}

type GroupedTickets = {
  overdue: Ticket[];
  today: Ticket[];
  tomorrow: Ticket[];
  thisWeek: Ticket[];
  upcoming: Ticket[];
  unscheduled: Ticket[];
};

export function TimeframeView({ tickets, contacts, onDelete }: TimeframeViewProps) {
  const groupedTickets = React.useMemo<GroupedTickets>(() => {
    const groups: GroupedTickets = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      upcoming: [],
      unscheduled: [],
    };

    const now = new Date();

    for (const ticket of tickets) {
      if (!ticket.dueDateStart) {
        groups.unscheduled.push(ticket);
        continue;
      }

      const startDate = new Date(ticket.dueDateStart);

      if (isPast(startDate) && !isToday(startDate)) {
        groups.overdue.push(ticket);
      } else if (isToday(startDate)) {
        groups.today.push(ticket);
      } else if (isTomorrow(startDate)) {
        groups.tomorrow.push(ticket);
      } else if (isThisWeek(startDate, { weekStartsOn: 1 })) { // Monday as start of week
        groups.thisWeek.push(ticket);
      } else {
        groups.upcoming.push(ticket);
      }
    }
    
    // sort tickets in each group by start date
    for (const key in groups) {
      (groups[key as keyof GroupedTickets] as Ticket[]).sort((a,b) => (a.dueDateStart || 0) - (b.dueDateStart || 0));
    }

    return groups;
  }, [tickets]);

  const groupOrder: (keyof GroupedTickets)[] = ['overdue', 'today', 'tomorrow', 'thisWeek', 'upcoming', 'unscheduled'];
  const groupLabels: Record<keyof GroupedTickets, string> = {
    overdue: 'Overdue',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    upcoming: 'Upcoming',
    unscheduled: 'Unscheduled',
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">No tickets yet</h2>
        <p className="text-muted-foreground mt-2">Click "New Ticket" to get started.</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={['overdue', 'today', 'tomorrow']} className="w-full space-y-4">
      {groupOrder.map(groupKey => {
        const groupTickets = groupedTickets[groupKey];
        if (groupTickets.length === 0) return null;

        return (
          <AccordionItem value={groupKey} key={groupKey} className="border-0 rounded-lg bg-card/50 backdrop-blur-sm px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{groupLabels[groupKey]}</h3>
                <span className="text-sm text-muted-foreground">({groupTickets.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {groupTickets.map(ticket => (
                  <TicketCard 
                    key={ticket.id}
                    ticket={ticket}
                    contact={contacts.find(c => c.id === ticket.contactId)}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
