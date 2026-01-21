
import * as React from 'react';
import EditPageClient from './edit-page-client';
import { getTicket } from '@/lib/actions';
import { notFound } from 'next/navigation';

interface EditPageProps {
  params: {
    compositionId: string;
  };
}

export default async function EditPage({ params }: EditPageProps) {
  const ticket = await getTicket(params.compositionId);

  if (!ticket) {
    notFound();
  }
  
  return <EditPageClient compositionId={params.compositionId} initialTicket={ticket} />;
}
