const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
    const num = parseInt(hmac, 16) % range;
    return { value: num, hmac, random: random.toString('hex') };
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
    console.log("\nProbability Table:");
    const header = [" ", ...diceConfigs.map((_, i) => `Dice ${i + 1}`)].join(" | ");
    console.log(header);
    console.log("-".repeat(header.length));
    diceConfigs.forEach((config1, i) => {
      const row = [`Dice ${i + 1}`, ...diceConfigs.map(config2 => `${(ProbabilityCalculator.calculate(config1, config2) * 100).toFixed(2)}%`)].join(" | ");
      console.log(row);
    });
    console.log("-".repeat(header.length));
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
    
    console.log("\nLet's determine who makes the first move.");
    const firstMoveData = FairRandom.generateNumber(this.hmacKey, 2);
    console.log(`I selected a random value in the range 0..1 (HMAC=${firstMoveData.hmac}).`);
    console.log("Try to guess my selection.");
    console.log("0 - 0\n1 - 1\nX - exit\n? - help");
    
    const userGuess = await this.ask("Your selection: ");
    if (userGuess.toUpperCase() === "X") return this.exitGame();
    if (userGuess.toUpperCase() === "?") return console.log("Help: Guess 0 or 1."), this.startGame();
    
    console.log(`My selection: ${firstMoveData.value} (KEY=${this.hmacKey.toString('hex')}).`);
    
    const playerStarts = parseInt(userGuess, 10) === firstMoveData.value;
    console.log(playerStarts ? "You guessed correctly! You go first." : "I make the first move.");

    while (true) {
      console.log("\n--- New Round ---");
      const playerRoll = await this.rollDice(1);
      const computerRoll = await this.rollDice(2);
      
      console.log(`Final Results -> You: ${playerRoll}, Computer: ${computerRoll}`);
      if (playerRoll > computerRoll) {
        console.log("You win this round!");
        this.scores[1]++;
      } else if (playerRoll < computerRoll) {
        console.log("Computer wins this round!");
        this.scores[2]++;
      } else {
        console.log("It's a tie!");
      }

      console.log(`Score: You = ${this.scores[1]}, Computer = ${this.scores[2]}`);
      const answer = await this.ask("Continue? (Y/N): ");
      if (answer.toUpperCase() !== "Y") return this.exitGame();
    }
  }

  async rollDice(player) {
    console.log(player === 1 ? "It's time for your roll." : "It's time for my roll.");
    const rollData = FairRandom.generateNumber(this.hmacKey, 6);
    console.log(`I selected a random value in the range 0..5 (HMAC=${rollData.hmac}).`);
    console.log("Add your number modulo 6.");
    console.log("0 - 0\n1 - 1\n2 - 2\n3 - 3\n4 - 4\n5 - 5\nX - exit\n? - help");
    
    const userChoice = await this.ask("Your selection: ");
    if (userChoice.toUpperCase() === "X") return this.exitGame();
    if (userChoice.toUpperCase() === "?") return console.log("Help: Choose a number between 0 and 5."), this.rollDice(player);
    
    const userNum = parseInt(userChoice, 10);
    console.log(`My number is ${rollData.value} (KEY=${this.hmacKey.toString('hex')}).`);
    const finalRoll = (rollData.value + userNum) % 6;
    console.log(`The fair number generation result is ${rollData.value} + ${userNum} = ${finalRoll} (mod 6).`);
    return finalRoll;
  }

  ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
  }

  exitGame() {
    console.log("Game over.");
    rl.close();
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






