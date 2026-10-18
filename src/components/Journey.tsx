import { Stepper } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { PartnerStatus } from '../api/client';
import { isStopped, JOURNEY, journeyStep } from '../lib/partner';

/** Where the merchant is on the road to taking payments. A stopped account shows its step in red. */
export function Journey({ status }: { status: PartnerStatus }) {
  const { t } = useTranslation();
  return (
    <Stepper
      active={journeyStep(status)}
      color={isStopped(status) ? 'red' : undefined}
      size="sm"
      allowNextStepsSelect={false}
    >
      {JOURNEY.map((step) => (
        <Stepper.Step key={step} label={t(`journey.${step}.label`)} description={t(`journey.${step}.hint`)} />
      ))}
    </Stepper>
  );
}
