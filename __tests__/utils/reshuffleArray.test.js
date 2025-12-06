const { reshuffleArray } = require("../../utils/reshuffleArray");

describe("reshuffleArray", () => {
  test("должен перемешать массив", () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = reshuffleArray(original);

    // Проверяем, что элементы те же
    expect(shuffled.sort()).toEqual(original.sort());
    expect(shuffled.length).toBe(original.length);
  });

  test("не должен изменять исходный массив", () => {
    const original = [1, 2, 3, 4, 5];
    const originalCopy = [...original];
    reshuffleArray(original);

    expect(original).toEqual(originalCopy);
  });

  test("должен работать с пустым массивом", () => {
    const result = reshuffleArray([]);
    expect(result).toEqual([]);
  });

  test("должен работать с массивом из одного элемента", () => {
    const result = reshuffleArray([1]);
    expect(result).toEqual([1]);
  });

  test("должен работать с массивом объектов", () => {
    const original = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
      { id: 3, name: "C" },
    ];
    const shuffled = reshuffleArray(original);

    expect(shuffled.length).toBe(original.length);
    expect(shuffled.map((x) => x.id).sort()).toEqual([1, 2, 3]);
  });

  test("должен возвращать новый массив при каждом вызове", () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled1 = reshuffleArray(original);
    const shuffled2 = reshuffleArray(original);

    // Вероятность того, что два перемешивания дадут одинаковый порядок очень мала
    // Но если это произойдет, это не ошибка, просто проверим что это разные массивы
    expect(shuffled1).not.toBe(shuffled2); // Разные ссылки
  });
});

