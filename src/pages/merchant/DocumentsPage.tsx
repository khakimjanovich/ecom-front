import { Alert, Skeleton } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { messageFor } from '../../api/errors';
import { fetchMyDocument, useMyDocuments, useUploadDocument } from '../../api/queries';
import { DocumentsPanel } from '../../components/DocumentsPanel';
import { PageTitle } from '../../layout/PageTitle';

/** The merchant's company documents: what the bank needs before switching it on, and where each stands. */
export function DocumentsPage() {
  const { t } = useTranslation();
  const documents = useMyDocuments();
  const upload = useUploadDocument();
  return (
    <>
      <PageTitle title={t('documents.title')} description={t('documents.description')} />
      {documents.isPending && <Skeleton h={320} />}
      {documents.isError && <Alert color="red">{messageFor(documents.error)}</Alert>}
      {documents.data && (
        <div style={{ maxWidth: 760 }}>
          <DocumentsPanel
            data={documents.data}
            open={(doc) => fetchMyDocument(doc.id)}
            upload={{
              upload: (type, file, description) => upload.mutateAsync({ type, file, description }),
              busy: upload.isPending,
            }}
          />
        </div>
      )}
    </>
  );
}
