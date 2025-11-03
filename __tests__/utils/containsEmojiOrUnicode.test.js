// Тест для функции containsEmojiOrUnicode из commands/add.js
const containsEmojiOrUnicode = (text) => {
  const emojiUnicodeRegex = /[\u{1F000}-\u{1FFFF}\u{2000}-\u{2FFF}\u{3000}-\u{3FFF}\u{FF00}-\u{FFFF}]/u;
  return emojiUnicodeRegex.test(text);
};

describe('containsEmojiOrUnicode', () => {
  describe('Обнаружение эмодзи', () => {
    test('должен обнаружить обычные эмодзи', () => {
      expect(containsEmojiOrUnicode('Hello 😀 World')).toBe(true);
      expect(containsEmojiOrUnicode('🏀')).toBe(true);
      expect(containsEmojiOrUnicode('⚽')).toBe(true);
      expect(containsEmojiOrUnicode('🎮')).toBe(true);
      expect(containsEmojiOrUnicode('🚗')).toBe(true);
    });

    test('должен обнаружить несколько эмодзи', () => {
      expect(containsEmojiOrUnicode('😀 😃 😄')).toBe(true);
      expect(containsEmojiOrUnicode('User 🏀⚽🎮')).toBe(true);
    });

    test('не должен обнаруживать эмодзи в валидных строках', () => {
      expect(containsEmojiOrUnicode('Hello')).toBe(false);
      expect(containsEmojiOrUnicode('Player123')).toBe(false);
      expect(containsEmojiOrUnicode('Test User')).toBe(false);
      expect(containsEmojiOrUnicode('john_doe')).toBe(false);
    });
  });

  describe('Обнаружение Unicode символов', () => {
    test('должен обнаружить специальные Unicode символы', () => {
      expect(containsEmojiOrUnicode('Text 〃')).toBe(true);
      expect(containsEmojiOrUnicode('Text ＠')).toBe(true);
      expect(containsEmojiOrUnicode('Text ＿')).toBe(true);
    });

    test('не должен обнаруживать ASCII символы', () => {
      expect(containsEmojiOrUnicode('ASCII text 123 !@#$%')).toBe(false);
      expect(containsEmojiOrUnicode('normal-text')).toBe(false);
    });
  });

  describe('Крайние случаи', () => {
    test('должен вернуть false для пустой строки', () => {
      expect(containsEmojiOrUnicode('')).toBe(false);
    });

    test('должен вернуть false для null', () => {
      expect(containsEmojiOrUnicode(null)).toBe(false);
    });

    test('должен вернуть false для undefined', () => {
      expect(containsEmojiOrUnicode(undefined)).toBe(false);
    });

    test('должен обработать только эмодзи', () => {
      expect(containsEmojiOrUnicode('😀')).toBe(true);
      expect(containsEmojiOrUnicode('🏀⚽')).toBe(true);
    });

    test('должен обнаружить эмодзи в середине строки', () => {
      expect(containsEmojiOrUnicode('Hello 😀 World')).toBe(true);
      expect(containsEmojiOrUnicode('Test User 🏀 Name')).toBe(true);
    });

    test('должен обнаружить эмодзи в начале строки', () => {
      expect(containsEmojiOrUnicode('😀Hello')).toBe(true);
      expect(containsEmojiOrUnicode('🏀 Player')).toBe(true);
    });

    test('должен обнаружить эмодзи в конце строки', () => {
      expect(containsEmojiOrUnicode('Player 😀')).toBe(true);
      expect(containsEmojiOrUnicode('Test User 🏀')).toBe(true);
    });
  });

  describe('Реальные примеры пользователей', () => {
    test('должен принять валидные username', () => {
      expect(containsEmojiOrUnicode('player123')).toBe(false);
      expect(containsEmojiOrUnicode('John Doe')).toBe(false);
      expect(containsEmojiOrUnicode('john_doe_99')).toBe(false);
      expect(containsEmojiOrUnicode('TestUser')).toBe(false);
    });

    test('должен отклонить username с эмодзи', () => {
      expect(containsEmojiOrUnicode('player😀')).toBe(true);
      expect(containsEmojiOrUnicode('😀player')).toBe(true);
      expect(containsEmojiOrUnicode('player 😀')).toBe(true);
      expect(containsEmojiOrUnicode('🏀⚽player')).toBe(true);
    });

    test('должен принять валидные имена', () => {
      expect(containsEmojiOrUnicode('Иван Иванов')).toBe(false);
      expect(containsEmojiOrUnicode('John')).toBe(false);
      expect(containsEmojiOrUnicode('Mary Jane')).toBe(false);
    });

    test('должен отклонить имена с эмодзи', () => {
      expect(containsEmojiOrUnicode('Player 😀')).toBe(true);
      expect(containsEmojiOrUnicode('Test User 🏀')).toBe(true);
    });
  });
});

