import { Button, Menu } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { currentLanguage, LANGUAGES } from '../i18n';

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === currentLanguage()) ?? LANGUAGES[0];
  return (
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <Button
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<IconLanguage size={16} />}
          aria-label={t('common.language')}
        >
          {current.short}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {LANGUAGES.map((language) => (
          <Menu.Item
            key={language.code}
            onClick={() => void i18n.changeLanguage(language.code)}
            fw={language.code === current.code ? 600 : undefined}
          >
            {language.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
