const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {type: String, unique: true,},
  password: {type: String,},
  email: {type: String,},
  loginHistory: [
    {dateTime: {type: Date,}, userAgent: {type: String,},},
  ],
});

let User;

module.exports.initialize = () => {
  return new Promise((resolve, reject) => {
    const db = mongoose.createConnection("mongodb+srv://Navdeep:<83bu7Fw4Ey0UHEz5>@cluster0.pytwl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

    db.on("error", (err) => {
      reject(err);
    });

    db.once("open", () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
}

module.exports.registerUser = (userData) => {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
    } else {
      bcrypt
        .hash(userData.password, 10)
        .then((hash) => {
          const newUserData = {
            loginHistory:
              userData.userAgent && userData.userAgent !== "Unknown"
                ? [
                    {
                      dateTime: new Date(),
                      userAgent: userData.userAgent,
                    },
                  ]
                : [],
            userName: userData.userName,
            password: hash,
            email: userData.email,
          };

          const newUser = new User(newUserData);
          newUser
            .save()
            .then(() => resolve())
            .catch((err) => {
              if (err.code === 11000) {
                reject("User Name already taken");
              } else {
                reject(`There was an error creating the user: ${err}`);
              }
            });
        })
        .catch(() => {
          reject("There was an error encrypting the password");
        });
    }
  });
}

module.exports.checkUser = (userData) => {
  return new Promise((resolve, reject) => {
    User.findOne({ userName: userData.userName })
      .then((user) => {
        if (!user) {
          reject(`Unable to find user: ${userData.userName}`);
        } else {
          bcrypt
            .compare(userData.password, user.password)
            .then((result) => {
              if (!result) {
                reject(`Incorrect Password for user: ${userData.userName}`);
              } else {
                if (user.loginHistory.length === 8) {
                  user.loginHistory.pop();
                }

                if (userData.userAgent && userData.userAgent !== "Unknown") {
                  user.loginHistory.unshift({
                    dateTime: new Date(),
                    userAgent: userData.userAgent,
                  });
                }

                User.updateOne(
                  { userName: user.userName },
                  { $set: { loginHistory: user.loginHistory } }
                )
                  .then(() => resolve(user))
                  .catch((err) =>
                    reject(
                      `There was an error updating the user history: ${err}`
                    )
                  );
              }
            })
            .catch((err) => {
              reject(`There was an error verifying the password: ${err}`);
            });
        }
      })
      .catch((err) => {
        reject(`Unable to find user: ${userData.userName} - ${err}`);
      });
  });
}