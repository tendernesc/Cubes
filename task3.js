const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class Dice {
  constructor(sides) {
    this.sides = sides;
  }

  roll() {
    return Math.floor(Math.random() * this.sides) + 1;
  }
}

class HMACGenerator {
  static generateKey() {
    return crypto.randomBytes(32);
  }

  static generate(key, input) {
    return crypto.createHmac('sha3-256', key).update(input).digest('hex');
  }
}

class FairRandom {
  static generateNumber(key, range) {
    const random = crypto.randomBytes(32);
    const hmac = HMACGenerator.generate(key, random);
    const num = parseInt(hmac, 16);
    return { value: (num % range) + 1, hmac, random: random.toString('hex') };
  }
}

class ProbabilityCalculator {
  static calculate(config1, config2) {
    let totalOutcomes = 0;
    let favorableOutcomes = 0;

    for (let i = 0; i < config1.length; i++) {
      for (let j = 0; j < config2.length; j++) {
        totalOutcomes++;
        if (config1[i] > config2[j]) {
          favorableOutcomes++;
        }
      }
    }

    return favorableOutcomes / totalOutcomes;
  }
}

class Help {
  static printTable(diceConfigs) {
    const diceNames = diceConfigs.map((_, i) => `Dice ${i + 1}`);
    const colWidth = 10;
    const separator = "+".padEnd(colWidth * (diceConfigs.length + 1) + diceConfigs.length + 2, "-") + "+";

    console.log("\nProbability Table:");
    console.log(separator);

    let header = "|".padEnd(colWidth) + diceNames.map(name => name.padEnd(colWidth)).join("|") + "|";
    console.log(header);
    console.log(separator);

    diceConfigs.forEach((config1, i) => {
      let row = `| Dice ${i + 1} `.padEnd(colWidth);
      row += diceConfigs
        .map(config2 => `${(ProbabilityCalculator.calculate(config1, config2) * 100).toFixed(2)}%`.padEnd(colWidth))
        .join("|");
      console.log(row + "|");
    });

    console.log(separator);
  }
}

class DiceGame {
  constructor(diceConfigs) {
    this.hmacKey = HMACGenerator.generateKey();
    this.scores = { 1: 0, 2: 0 };
    this.diceConfigs = diceConfigs;
  }

  async startGame() {
    console.log("\nGame started!");
    Help.printTable(this.diceConfigs);

    let round = 1;
    while (true) {
      console.log(`\n--- Round ${round} ---`);

      const compRollData = FairRandom.generateNumber(this.hmacKey, 6);
      console.log(`HMAC: ${compRollData.hmac}`);

      const userChoice = await this.ask(`Choose your dice (index 0-${this.diceConfigs.length - 1}): `);
      const diceIndex = parseInt(userChoice, 10);

      if (isNaN(diceIndex) || diceIndex < 0 || diceIndex >= this.diceConfigs.length) {
        console.log("Invalid choice. Try again.");
        continue;
      }

      const userDice = this.diceConfigs[diceIndex];
      const userRoll = userDice[Math.floor(Math.random() * userDice.length)];
      const compRoll = compRollData.value;

      console.log(`Your roll: ${userRoll}`);
      console.log(`Computer roll: ${compRoll}`);
      console.log(`Random value used for HMAC: ${compRollData.random}`);

      const verifyHMAC = HMACGenerator.generate(this.hmacKey, Buffer.from(compRollData.random, 'hex'));
      console.log(`Verification HMAC: ${verifyHMAC}`);

      if (verifyHMAC === compRollData.hmac) {
        console.log("HMAC verification successful!");
      } else {
        console.log("HMAC verification failed! Something is wrong.");
      }

      if (userRoll > compRoll) {
        console.log("You win this round!");
        this.scores[1]++;
      } else if (userRoll < compRoll) {
        console.log("Computer wins this round!");
        this.scores[2]++;
      } else {
        console.log("It's a tie!");
      }

      console.log(`Score: You = ${this.scores[1]}, Computer = ${this.scores[2]}`);

      const answer = await this.ask("Continue? (Y/N): ");
      if (answer.toUpperCase() !== "Y") {
        console.log("Game over.");
        rl.close();
        break;
      }
      round++;
    }
  }

  ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Error: You must provide at least one dice configuration.");
  process.exit(1);
}

const diceConfigs = args.map(config =>
  config.split(",").map(num => {
    const parsed = parseInt(num.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.error(`Error: Invalid number "${num}" in configuration ${config}.`);
      process.exit(1);
    }
    return parsed;
  })
);

console.log(`\nDice configurations: ${JSON.stringify(diceConfigs)}`);

const game = new DiceGame(diceConfigs);
game.startGame();



