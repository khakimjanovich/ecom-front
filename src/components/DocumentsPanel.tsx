import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconCircleCheck, IconClock, IconFileText, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentType, PartnerDocument, PartnerDocuments } from '../api/client';
import { notifyError, notifySuccess } from '../lib/notify';
import { formatDate } from '../lib/time';
import { PromptModal } from './PromptModal';

const TYPES: DocumentType[] = ['CHARTER', 'PASSPORT', 'LICENSE', 'POWER_OF_ATTORNEY'];
const STATUS_COLOR = { UPLOADED: 'yellow', VERIFIED: 'green', REJECTED: 'red', REPLACED: 'gray' } as const;
const KYB_COLOR = { ACTION_REQUIRED: 'yellow', IN_REVIEW: 'blue', APPROVED: 'green' } as const;
const ACCEPT = 'application/pdf,image/png,image/jpeg';
const MAX_BYTES = 10 * 1024 * 1024;

type Review = {
  approve: (doc: PartnerDocument) => void;
  reject: (doc: PartnerDocument, reason: string) => void;
  busy: boolean;
};
type Upload = {
  upload: (type: DocumentType, file: File, description?: string) => Promise<unknown>;
  busy: boolean;
};

/**
 * Know your business, the same for both sides: each document type with its latest upload and where it
 * stands. The merchant uploads (upload), the bank verifies or rejects (review); anyone can open a file.
 */
export function DocumentsPanel({
  data,
  open,
  upload,
  review,
}: {
  data: PartnerDocuments;
  open: (doc: PartnerDocument) => void;
  upload?: Upload;
  review?: Review;
}) {
  const { t } = useTranslation();
  const latest = (type: DocumentType) =>
    data.documents.find((d) => d.type === type && d.status !== 'REPLACED');
  const earlier = (type: DocumentType) =>
    data.documents.filter((d) => d.type === type && d.status === 'REPLACED');
  return (
    <Stack>
      <KybAlert data={data} />
      {TYPES.map((type) => (
        <DocumentRow
          key={type}
          type={type}
          required={data.kyb.required.includes(type)}
          current={latest(type)}
          history={earlier(type)}
          open={open}
          upload={upload}
          review={review}
        />
      ))}
      <Text size="xs" c="dimmed">
        {t('documents.formats')}
      </Text>
    </Stack>
  );
}

export function KybBadge({ data }: { data: PartnerDocuments }) {
  const { t } = useTranslation();
  return (
    <Badge variant="light" color={KYB_COLOR[data.kyb.status]}>
      {t(`documents.kyb.${data.kyb.status}`)}
    </Badge>
  );
}

function KybAlert({ data }: { data: PartnerDocuments }) {
  const { t } = useTranslation();
  const names = (types: DocumentType[]) => types.map((type) => t(`documents.type.${type}`)).join(', ');
  const kyb = data.kyb;
  return (
    <Alert
      color={KYB_COLOR[kyb.status]}
      icon={kyb.status === 'APPROVED' ? <IconCircleCheck size={18} /> : <IconClock size={18} />}
      title={t(`documents.kyb.${kyb.status}`)}
    >
      {kyb.status === 'APPROVED' && t('documents.kybApproved')}
      {kyb.status === 'IN_REVIEW' && t('documents.kybInReview', { types: names(kyb.waiting) })}
      {kyb.status === 'ACTION_REQUIRED' && t('documents.kybMissing', { types: names(kyb.missing) })}
    </Alert>
  );
}

function DocumentRow({
  type,
  required,
  current,
  history,
  open,
  upload,
  review,
}: {
  type: DocumentType;
  required: boolean;
  current?: PartnerDocument;
  history: PartnerDocument[];
  open: (doc: PartnerDocument) => void;
  upload?: Upload;
  review?: Review;
}) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const tooBig = !!file && file.size > MAX_BYTES;

  const send = () =>
    file &&
    upload
      ?.upload(type, file, note)
      .then(() => {
        setFile(null);
        setNote('');
        notifySuccess(t('documents.uploaded'));
      })
      .catch(notifyError);

  return (
    <Card withBorder padding="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <ThemeIcon variant="light" color="gray" size="lg">
            <IconFileText size={18} />
          </ThemeIcon>
          <div>
            <Group gap={6}>
              <Title order={5}>{t(`documents.type.${type}`)}</Title>
              {required ? (
                <Badge size="xs" variant="outline">
                  {t('documents.required')}
                </Badge>
              ) : (
                <Badge size="xs" variant="outline" color="gray">
                  {t('documents.optional')}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              {t(`documents.hint.${type}`)}
            </Text>
          </div>
        </Group>
        {current && (
          <Badge variant="light" color={STATUS_COLOR[current.status]}>
            {t(`documents.status.${current.status}`)}
          </Badge>
        )}
      </Group>

      {current && (
        <Stack gap={2} mt="sm" ml={46}>
          <Anchor size="sm" onClick={() => open(current)}>
            {current.fileName}
          </Anchor>
          <Text size="xs" c="dimmed">
            {formatDate(current.uploadedAt)} · {Math.max(1, Math.round(current.size / 1024))} KB
            {current.description && ` · ${current.description}`}
          </Text>
          {current.reviewedBy && (
            <Text size="xs" c="dimmed">
              {t(`documents.reviewed.${current.status}`, { name: current.reviewedBy })}{' '}
              {current.reviewedAt && `· ${formatDate(current.reviewedAt)}`}
            </Text>
          )}
          {current.rejectReason && (
            <Text size="sm" c="red">
              “{current.rejectReason}”
            </Text>
          )}
          {history.length > 0 && (
            <Text size="xs" c="dimmed">
              {t('documents.earlier', { count: history.length })}
            </Text>
          )}
        </Stack>
      )}

      {review && current?.status === 'UPLOADED' && (
        <Group mt="sm" ml={46}>
          <Button size="xs" loading={review.busy} onClick={() => review.approve(current)}>
            {t('documents.verify')}
          </Button>
          <Button size="xs" variant="light" color="red" onClick={() => setRejecting(true)}>
            {t('documents.reject')}
          </Button>
          <PromptModal
            opened={rejecting}
            onClose={() => setRejecting(false)}
            title={t('documents.reject')}
            label={t('partner.reason')}
            hint={t('documents.rejectHint')}
            multiline
            confirmLabel={t('documents.reject')}
            color="red"
            loading={review.busy}
            onSubmit={(reason) => {
              review.reject(current, reason);
              setRejecting(false);
            }}
          />
        </Group>
      )}

      {upload && current?.status !== 'VERIFIED' && (
        <Stack gap="xs" mt="sm" ml={46}>
          <Group gap="xs">
            <FileButton onChange={setFile} accept={ACCEPT}>
              {(props) => (
                <Button {...props} size="xs" variant="default" leftSection={<IconUpload size={14} />}>
                  {current ? t('documents.replace') : t('documents.choose')}
                </Button>
              )}
            </FileButton>
            {file && (
              <Text size="xs" c={tooBig ? 'red' : undefined}>
                {file.name} {tooBig && `· ${t('documents.tooBig')}`}
              </Text>
            )}
          </Group>
          {file && !tooBig && (
            <>
              <Textarea
                size="xs"
                placeholder={t('documents.note')}
                aria-label={t('documents.note')}
                maxLength={500}
                autosize
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
              />
              <Group>
                <Button size="xs" loading={upload.busy} onClick={send}>
                  {t('documents.upload')}
                </Button>
              </Group>
            </>
          )}
        </Stack>
      )}
    </Card>
  );
}
