import en from './en.json';
import ru from './ru.json';
import uz from './uz.json';

const keys = (tree: object, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

describe('translations', () => {
  it('have the same keys in every language, so nothing falls back to English unnoticed', () => {
    expect(keys(ru).sort()).toEqual(keys(en).sort());
    expect(keys(uz).sort()).toEqual(keys(en).sort());
  });

  it('use the same placeholders in every language', () => {
    const text = (tree: object, key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], tree) as string;
    const placeholders = (tree: object) =>
      Object.fromEntries(
        keys(tree).map((k) => [
          k,
          text(tree, k)
            .match(/{{\w+}}/g)
            ?.sort() ?? [],
        ]),
      );
    expect(placeholders(ru)).toEqual(placeholders(en));
    expect(placeholders(uz)).toEqual(placeholders(en));
  });
});
