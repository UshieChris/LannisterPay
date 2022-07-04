const express = require("express");

const app = express();
const port = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.post("/split-payments/compute", async (req, res) => {
  const newTransaction = req.body;
  const { ID, Amount, Currency, CustomerEmail, SplitInfo } = newTransaction;
  try {
    if (ID && Amount && Currency && CustomerEmail && SplitInfo) {
      //Sort arrays based on different transaction types
      let flatArray = newTransaction.SplitInfo.filter(
        (item) => item.SplitType === "FLAT"
      );
      let percentageArray = newTransaction.SplitInfo.filter(
        (item) => item.SplitType === "PERCENTAGE"
      );
      let ratioArray = newTransaction.SplitInfo.filter(
        (item) => item.SplitType === "RATIO"
      );

      const sortedArray = flatArray.concat(percentageArray, ratioArray);

      // Format for response
      let result = {
        ID: newTransaction.ID,
        Balance: newTransaction.Amount,
        SplitBreakdown: [],
      };

      //Compute split amounts for FLAT and PERCENTAGE
      sortedArray.forEach((transaction) => {
        let { SplitBreakdown } = result;
        const { SplitType, SplitValue, SplitEntityId } = transaction;

        if (SplitType === "FLAT") {
          // Confirm that split Amount is not less than zero and is less than transaction amount
          if (SplitValue > newTransaction.Amount || SplitValue < 0) {
            throw Error(
              "Split amount value is either greater than transaction amount or less than zero"
            );
          }
          result.Balance = result.Balance - SplitValue;
          SplitBreakdown.push({ SplitEntityId, Amount: SplitValue });
        } else if (SplitType === "PERCENTAGE") {
          let amount = (SplitValue / 100) * result.Balance;

          // Confirm that split Amount is not less than zero and is less than transaction amount
          if (amount > newTransaction.Amount || amount < 0) {
            throw Error(
              "Split amount value is either greater than transaction amount or less than zero"
            );
          }
          SplitBreakdown.push({
            SplitEntityId,
            Amount: amount,
          });
          result.Balance = result.Balance - amount;
        }
        return result;
      });

      // Compute Total ratio
      let totalRatio = 0;
      ratioArray.forEach((transaction) => {
        totalRatio = totalRatio + transaction.SplitValue;
        return totalRatio;
      });

      // Compute split amount for RATIO transactions
      let ratioBalance = result.Balance;
      sortedArray.forEach((transaction) => {
        let { SplitBreakdown } = result;
        const { SplitType, SplitValue, SplitEntityId } = transaction;

        if (SplitType === "RATIO") {
          let amount = (SplitValue / totalRatio) * ratioBalance;

          // Confirm that split Amount is not less than zero and is less than transaction amount
          if (amount > newTransaction.Amount || amount < 0) {
            throw Error(
              "Split amount value is either greater than transaction amount or less than zero"
            );
          }
          SplitBreakdown.push({
            SplitEntityId,
            Amount: amount,
          });
          result.Balance = result.Balance - amount;
        }
        return result;
      });

      //To check if sum of all split amount values is greater than transaction amount
      if (result.Balance < 0) {
        throw Error("balance is zero");
      }
      res.status(200).send({ ...result });
    } else {
      throw Error("Required field missing");
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.listen(port, () => console.log("Server loading....."));
