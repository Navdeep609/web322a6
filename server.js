/*********************************************************************************
WEB322 – Assignment 06
I declare that this assignment is my own work in accordance with Seneca Academic Policy.  
No part of this assignment has been copied manually or electronically from any other source (including 3rd party web sites) or distributed to other students.

Name: Navdeep Singh
Student ID: 166825224
Date: 13th AUGUST, 2024
Vercel Web App URL: 
GitHub Repository URL:  

********************************************************************************/

const express = require("express");
const storeService = require("./store-service");
const authData = require('./auth-service.js');

const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "/public")));

const HTTP_PORT = process.env.HTTP_PORT || 8080;

const multer = require("multer");
const clientSessions = require('client-sessions');
const upload = multer();
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const exphbs = require("express-handlebars");
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "hbs");
const pg = require('pg');

cloudinary.config({
  cloud_name: "dysnoha8g",
  api_key: "615754719152467",
  api_secret: "h0CuD99XhUl2PQkaMYZ9_QrnEv4",
  secure: true,
});

app.use(clientSessions({
  cookieName: 'session',
  secret: 'navdeepsingh',
  duration: 24 * 60 * 60 * 1000, 
  activeDuration: 30 * 60 * 1000 
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.use((req, res, next) => {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

function ensureLogin(req, res, next) {
  if (req.session.user) {
      next();
  } else {
      res.redirect('/login');
  }
}

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
      navLink: function (url, options) {
        return (
          '<li class="nav-item"><a ' +
          (url === app.locals.activeRoute
            ? ' class="nav-link active"'
            : 'class="nav-link"') +
          ' href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue !== rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
      formatDate: function (dateObj) {
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      },
    },
  })
);

app.get("/", (req, res) => {
  res.redirect("shop");
});

app.get("/about", (req, res) => {
  console.log("hello index");

  // res.sendFile(path.join(__dirname, "/views/about.html"))
  res.render("about");
});

// app.get('/shop', (req, res) => {
//     storeService.getPublishedItems()
//         .then(items => {
//             res.json(items);
//         })
//         .catch(err => {
//             res.status(500).json({ message: err });
//         });
// });

app.get("/shop", async (req, res) => {
  let shopItem = {};

  try {
    let items = [];
    if (req.query.category) {
      items = await storeService.getPublishedItemsByCategory(
        req.query.category
      );
    } else {
      items = await storeService.getPublishedItems();
    }
    items.sort((a, b) => new Date(b.itemDate) - new Date(a.itemDate));
    let post = items[0];
    shopItem.items = items;
    shopItem.item = post;
  } catch (err) {
    shopItem.message = "No results";
  }

  try {
    let categories = await storeService.getCategories();
    shopItem.categories = categories;
  } catch (err) {
    shopItem.categoriesMessage = "No results";
  }
  res.render("shop", { data: shopItem });
});

app.get("/shop/:id", async (req, res) => {
  let shopItem = {};

  try {
    const item = await storeService.getItemById(req.params.id);
    if (!item || !item.published) {
      shopItem.message = `No results for item with ID: ${req.params.id}`;
    } else {
      shopItem.item = item;

      const category = await storeService.getCategoryById(item.categoryID);
      shopItem.item.categoryName = category ? category.categoryName : "Unknown";
    }
  } catch (err) {
    shopItem.message = "Error fetching item details";
  }

  try {
    const items = req.query.category
      ? await storeService.getPublishedItemsByCategory(req.query.category)
      : await storeService.getPublishedItems();
    items.sort((a, b) => new Date(b.itemDate) - new Date(a.itemDate));
    shopItem.items = items;
  } catch (err) {
    shopItem.message = "No results for items";
  }

  try {
    const categories = await storeService.getCategories();
    shopItem.categories = categories;
  } catch (err) {
    shopItem.categoriesMessage = "No results for categories";
  }

  res.render("shop", { data: shopItem });
});

// only when login then other will get displayed

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');

  authData.checkUser(req.body)
    .then(user => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory
      };
      res.redirect('/items');
    })
    .catch(err => {
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  authData.registerUser(req.body)
    .then(() => {
      res.render('register', { successMessage: "User created" });
    })
    .catch(err => {
      res.render('register', { errorMessage: err, userName: req.body.userName });
    });
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

// ---------------------------------------------

app.get("/items", ensureLogin, async (req, res) => {
  // storeService.getAllItems()
  //     .then(items => {
  //         res.json(items);
  //     })
  //     .catch(err => {
  //         res.status(500).json({ message: err });
  //     });

  // if (req.query.category) {
  //     storeService
  //       .getItemsByCategory(req.query.category)
  //       .then((data) => res.render("items", { items: data }))
  //       .catch((err) =>
  //         res.status(500).render("posts", { error: err })
  //       );
  //   } else if (req.query.minDate) {
  //     storeService
  //       .getItemsByMinDate(req.query.minDate)
  //       .then((data) => res.render("items", { items: data }))
  //       .catch((err) =>
  //         res.status(500).render("posts", { error: err })
  //       );
  //   } else {
  //     storeService
  //       .getAllItems()
  //       .then((data) => res.render("items", { items: data }))
  //       .catch((err) =>
  //         res.status(500).render("posts", { error: err })
  //       );
  //   }
  try {
    let items;
    if (req.query.category) {
      items = await storeService.getItemsByCategory(req.query.category);
    } else if (req.query.minDate) {
      items = await storeService.getItemsByMinDate(req.query.minDate);
    } else {
      items = await storeService.getAllItems();
    }
    const categories = await storeService.getCategories();
    const categoryMap = categories.reduce((map, category) => {
      map[category.categoryID] = category.categoryName;
      return map;
    }, {});
    items = items.map((item) => ({
      ...item,
      categoryName: categoryMap[item.categoryID] || "Unknown",
    }));

    res.render("items", { items });
  } catch (err) {
    res.render("items", { message: "No results" });
  }
});

app.get("/item/:id", ensureLogin, (req, res) => {
  storeService
    .getItemById(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.status(500).json({ message: err });
    });
});

app.get("/items/add", ensureLogin, async(req, res) => {
  try {
    const categories = await storeService.getCategories();
    res.render('addItem', { categories });
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch categories: " + err.message });
  }
});

app.post("/items/add", ensureLogin, upload.single("featureImage"), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);
      console.log(result);
      return result;
    }

    upload(req)
      .then((uploaded) => {
        processItem(uploaded.url);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Image upload failed");
      });
  } else {
    processItem("");
  }

  function processItem(imageUrl) {
    req.body.featureImage = imageUrl;

    storeService
      .addItem(req.body)
      .then(() => {
        res.redirect("/items");
      })
      .catch((err) => {
        res.status(500).send(`Error adding item: ${err}`);
      });
  }
});

app.get("/categories/add", ensureLogin, (req, res) => {
  res.render("addCategory");
});

app.post("/categories/add", ensureLogin, (req, res) => {
  storeService
    .addCategory(req.body)
    .then(() => res.redirect("/categories"))
    .catch((err) => res.status(500).send(`error`));
});

app.get("/categories/delete/:id", ensureLogin, (req, res) => {
  storeService
    .deleteCategoryById(req.params.id)
    .then(() => res.redirect("/categories"))
    .catch(() => res.status(500).send("Unable to Remove Category / Category not found"));
});

app.get("/items/delete/:id", ensureLogin, (req, res) => {
  storeService
    .deleteItemById(req.params.id)
    .then(() => res.redirect("/items"))
    .catch(() => res.status(500).send("error"));
});

app.get("/categories", ensureLogin, (req, res) => {
  // storeService.getCategories()
  //     .then(categories => {

  //         res.json(categories);
  //     })
  //     .catch(err => {
  //         res.status(500).json({ message: err });

  //     });
  storeService
    .getCategories()
    .then((data) => {
      if (data.length > 0) {
        res.render("categories", { categories: data });
      } else {
        res.render("categories", { message: "no results" });
      }
    })
    .catch((err) => res.status(500).render("categories", { message: "no categories" }));
});

app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

storeService
  .initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Express http server listening on port ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.log(`Failed to initialize the server: ${err}`);
  });

module.exports = app;
