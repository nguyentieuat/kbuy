// controllers/categories.controller.js
const categoriesService = require("../services/categories.service");

const getCategoryTree = async (req, res) => {
  try {

    const data = await categoriesService.getCategoryTree();

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function getCategoryTreeWithCount(req, res) {
  try {
    const data = await categoriesService.getCategoryTreeWithCount();

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[categories.controller] getCategoryTree:", err.message);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}

module.exports = {
  getCategoryTree,
  getCategoryTreeWithCount
};
