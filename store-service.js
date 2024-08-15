const Sequelize = require("sequelize");

var sequelize = new Sequelize("neondb", "neondb_owner", "BHTzFi5WXO2A", {
  host: "ep-tiny-cake-a5k20wn6.us-east-2.aws.neon.tech",
  dialect: "postgres",
  port: 5432,
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  },
  query: { raw: true },
});

const Category = sequelize.define("Category", {
  categoryID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  categoryName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

const Item = sequelize.define("item", {
  body: Sequelize.TEXT,
  title: Sequelize.STRING,
  itemDate: Sequelize.DATE,
  featureImage: Sequelize.STRING,
  published: Sequelize.BOOLEAN,
  price: Sequelize.DOUBLE,
  categoryID: {
    type: Sequelize.INTEGER,
    references: {
      model: Category,
      key: "categoryID",
    },
  },
});

Item.belongsTo(Category, { foreignKey: "categoryID" });

module.exports.initialize = function () {
  return new Promise((resolve, reject) => {
    sequelize
      .sync()
      .then(() => {
        resolve("Synced the database.");
      })
      .catch((err) => {
        reject("Unable to sync the database");
      });
  });
};

module.exports.getItemById = (id) => {
  return new Promise((resolve, reject) => {
    Item.findOne({
      where: { id: id },
    })
      .then((item) => {
        if (item) {
          resolve(item);
        } else {
          reject("item not found!");
        }
      })
      .catch((err) => reject("no results returned"));
  });
};

module.exports.getItemsByMinDate = (minDateStr) => {
  return Item.findAll({
    where: {
      itemDate: {
        [gte]: new Date(minDateStr),
      },
    },
  })
    .then((data) =>
      data.length
        ? Promise.resolve(data)
        : Promise.reject("no results returned")
    )
    .catch((err) => Promise.reject("no results returned"));
};

module.exports.getAllItems = function () {
  // // This function is exported from the module and named "getAllItems".
  // It's likely used to retrieve all available items.

  return Item.findAll()
    .then((data) =>
      data.length ? Promise.resolve(data) : Promise.reject("no items found!")
    )
    .catch((err) => Promise.reject("no results returned"));
};

module.exports.addItem = (itemData) => {
  itemData.published = !!itemData.published;
  itemData.itemDate = new Date();
  itemData.categoryID = parseInt(itemData.categoryID, 10);

  return new Promise((resolve, reject) => {
    Item.create(itemData)
      .then(() => resolve())
      .catch((err) => reject("unable to create item"));
  });
};

module.exports.getItemsByCategory = (category) => {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        categoryID: category,
      },
    })
      .then((data) => resolve(data))
      .catch((err) => reject("no results returned"));
  });
};

module.exports.getCategories = function () {
  // return new Promise((resolve, reject) => { // This line returns a new Promise object, allowing for asynchronous handling of category retrieval.
  //   // The `resolve` and `reject` functions are used to signal success or failure.

  //     if (categories.length == 0) {
  //         reject("no results returned");// If empty, the Promise is rejected with an error message
  //         // indicating no categories were found.
  //     } else { //
  //         resolve(categories);
  //     }
  // });
  return Category.findAll()
    .then((data) =>
      data.length
        ? Promise.resolve(data)
        : Promise.reject("no results returned")
    )
    .catch((err) => Promise.reject("no results returned"));
};

module.exports.getPublishedItems = () => {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        published: true,
      },
    })
      .then((data) => resolve(data))
      .catch((err) => reject("no results returned"));
  });
};

module.exports.getCategoryById = (id) => {
  return new Promise((resolve, reject) => {
    Category.findByPk(id)
      .then((category) => {
        if (category) {
          resolve(category);
        } else {
          resolve(null);
        }
      })
      .catch((err) => reject("Error fetching category details: " + err));
  });
};

module.exports.getPublishedItemsByCategory = (category) => {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        categoryID: category,
        published: true,
      },
    })
      .then((data) => resolve(data))
      .catch((err) => reject("no results returned"));
  });
};

module.exports.addCategory = (categoryData) => {
  for (const key in categoryData) {
    if (categoryData[key] === "") {
      categoryData[key] = null;
    }
  }

  return Category.create(categoryData)
    .then(data => Promise.resolve(data))
    .catch(err => Promise.reject("unable to create category"));
  }

  module.exports.deleteCategoryById = (id) => {
    return Category.destroy({
      where: { categoryID: id },
    })
      .then((rowsDeleted) => {
        if (rowsDeleted === 0) {
          return Promise.reject("not found");
        } else {
          return Promise.resolve("deleted");
        }
      })
      .catch((err) => Promise.reject("unable to delete category"));
  };

  module.exports.deleteItemById = (id) => {
    return Item.destroy({ where: { id } })
      .then((result) => {
        if (result) {
          return Promise.resolve("deleted");
        } else {
          return Promise.reject("not found.");
        }
      })
      .catch((err) => Promise.reject(`unable to remove item`));
  };

