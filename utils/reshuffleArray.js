
// Функция перемешивания массива
const reshuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

module.exports = { reshuffleArray };