import en from './en.json';
import ru from './ru.json';
import uz from './uz.json';

const keys = (tree: object, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

// Plural forms differ by language (Russian has one/few/many), so `count_one` and `count_few` are both `count`.
const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '');
const baseKeys = (tree: object) => [...new Set(keys(tree).map(base))].sort();

describe('translations', () => {
  it('have the same keys in every language, so nothing falls back to English unnoticed', () => {
    expect(baseKeys(ru)).toEqual(baseKeys(en));
    expect(baseKeys(uz)).toEqual(baseKeys(en));
  });

  it('use the same placeholders in every language', () => {
    const text = (tree: object, key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], tree) as string;
    const placeholders = (tree: object) =>
      Object.fromEntries(
        keys(tree).map((k) => [
          base(k),
          text(tree, k)
            .match(/{{\w+}}/g)
            ?.sort() ?? [],
        ]),
      );
    expect(placeholders(ru)).toEqual(placeholders(en));
    expect(placeholders(uz)).toEqual(placeholders(en));
  });
});
