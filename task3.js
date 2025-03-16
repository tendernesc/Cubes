const readline = require('readline');
const crypto = require('crypto');

// Interface for reading from the console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Class for working with dice
class Dice {
  constructor(sides) {
    this.sides = sides;
  }

  roll() {
    return Math.floor(Math.random() * this.sides) + 1;
  }
}

// Class for generating HMAC
class HMACGenerator {
  // Генерация случайного ключа
  static generateKey() {
    return crypto.randomBytes(32); // Генерируем 256-битный ключ
  }

  // Генерация HMAC на основе ключа и сообщения
  static generate(key, input) {
    return crypto.createHmac('sha3-256', key)
      .update(input)
      .digest('hex'); // Возвращаем HMAC в виде строки
  }
}

// Class for fair random number generation
class FairRandom {
  // Генерация честного случайного числа на основе HMAC
  static generateNumber(key, range) {
    const random = crypto.randomBytes(32);
    const hmac = HMACGenerator.generate(key, random); // Генерация HMAC
    const num = parseInt(hmac, 16); // Преобразуем HMAC в число
    return num % range; // Модуль для получения числа в пределах диапазона
  }
}

// Class for calculating probabilities
class ProbabilityCalculator {
  static calculate(config1, config2) {
    let totalOutcomes = 0;
    let favorableOutcomes = 0;

    // Проходим по всем возможным результатам бросков двух кубиков
    for (let i = 0; i < config1.length; i++) {
      for (let j = 0; j < config2.length; j++) {
        totalOutcomes++;
        if (config1[i] > config2[j]) {
          favorableOutcomes++;
        }
      }
    }

    return favorableOutcomes / totalOutcomes; // Вероятность победы
  }

  static print(config1, config2) {
    const probability = this.calculate(config1, config2);
    console.log(`Probability that the user wins: ${(probability * 100).toFixed(2)}%`);
  }
}

// Class for helping with displaying probability table
class Help {
  static printTable(diceConfigs) {
    const diceNames = diceConfigs.map((config, index) => `Dice ${index + 1}`);
    console.log(`Probability of the win for the user:`);
    console.log(`+-------------+${diceNames.join('+')}+`);
    
    diceConfigs.forEach((config1, i) => {
      let row = `| ${diceNames[i]} |`;
      diceConfigs.forEach((config2, j) => {
        const prob = ProbabilityCalculator.calculate(config1, config2);
        row += ` ${(prob).toFixed(4)} |`; // Печать вероятности с точностью до 4 знаков
      });
      console.log(row);
    });
  }
}

// Main game class
class DiceGame {
  constructor(diceConfigs) {
    this.hmacKey = HMACGenerator.generateKey(); // Генерация ключа
    this.round = 1;
    this.scores = { 1: 0, 2: 0 };
    this.diceConfigs = diceConfigs;
  }

  printHelp() {
    console.log(`
      Commands:
      - ? or help: show help
      - X: exit the game
    `);
  }

  startGame() {
    console.log('The game has started!');

    // Показываем таблицу вероятностей
    Help.printTable(this.diceConfigs);

    rl.question('Enter a command or X to exit: ', (input) => {
      if (input === 'X') {
        console.log('Game over.');
        rl.close();
        return;
      }

      if (input === '?' || input === 'help') {
        this.printHelp();
        this.startGame();
        return;
      }

      // Честное случайное число для компьютерного хода
      const compRoll = FairRandom.generateNumber(this.hmacKey, 6);
      const userRoll = Math.floor(Math.random() * 6); // Пользовательское число

      console.log(`Computer roll: ${compRoll}`);
      console.log(`User roll: ${userRoll}`);

      // Решаем, кто победил
      if (userRoll > compRoll) {
        console.log('You win this round!');
        this.scores[1]++;
      } else if (userRoll < compRoll) {
        console.log('Computer wins this round!');
        this.scores[2]++;
      } else {
        console.log('It\'s a tie!');
      }

      console.log(`Current score: You = ${this.scores[1]}, Computer = ${this.scores[2]}`);

      rl.question('Do you want to continue? (Y/N): ', (answer) => {
        if (answer.toUpperCase() === 'Y') {
          this.startGame();
        } else {
          console.log('Game over.');
          rl.close();
        }
      });
    });
  }
}

// Read dice configuration from command-line arguments
const args = process.argv.slice(2); // Получаем аргументы из командной строки

// Проверка, что хотя бы один аргумент был передан
if (args.length < 1) {
  console.error('Error: You must provide at least one dice configuration.');
  process.exit(1);
}

const diceConfigs = [];

// Проверка каждого аргумента
args.forEach((config, index) => {
  // Разделяем конфигурацию на числа
  const numbers = config.split(',').map((num) => {
    const parsed = parseInt(num.trim(), 10); // Преобразуем в число
    if (isNaN(parsed) || parsed <= 0) {
      console.error(`Error: Invalid number "${num}" in configuration ${config}. All numbers must be positive integers.`);
      process.exit(1);
    }
    return parsed;
  });

  diceConfigs.push(numbers);
});

console.log(`Your dice configurations: ${JSON.stringify(diceConfigs)}`);

// Start the game
const game = new DiceGame(diceConfigs);
game.startGame();







