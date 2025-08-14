
import * as React from 'react';
import EditPageClient from './edit-page-client';

interface EditPageProps {
  params: {
    compositionId: string;
  };
}

export default function EditPage({ params }: EditPageProps) {
  return <EditPageClient compositionId={params.compositionId} />;
}
