// services/categories.service.js
const categoriesModel = require("../models/categories.model");

function buildTree(categories) {
  const map = {};
  const roots = [];

  categories.forEach((cat) => {
    map[cat.id] = { ...cat, children: [] };
  });

  categories.forEach((cat) => {
    if (cat.parent_id) {
      map[cat.parent_id]?.children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  });

  return roots;
}

function buildFullSlug(category, parentSlug = "") {
  const fullSlug = parentSlug
    ? `${parentSlug}/${category.slug}`
    : category.slug;

  return {
    ...category,
    full_slug: fullSlug,
    children: category.children?.map((child) =>
      buildFullSlug(child, fullSlug)
    ),
  };
}

const getCategoryTree = async () => {
  const categories = await categoriesModel.getAllCategories();

  const tree = buildTree(categories);

  const treeWithSlug = tree.map((cat) => buildFullSlug(cat));

  return treeWithSlug;
};


function aggregateCount(node) {
  const selfCount = Number(node.product_count || 0);

  if (!node.children || node.children.length === 0) {
    node.product_count = selfCount;
    return selfCount;
  }

  let total = selfCount;

  for (const child of node.children) {
    total += aggregateCount(child);
  }

  node.product_count = total;

  return total;
}

async function getCategoryTreeWithCount() {
  const flat = await categoriesModel.getCategoriesWithCount();

  const tree = buildTree(flat);

  const treeWithSlug = tree.map((cat) => buildFullSlug(cat));

  treeWithSlug.forEach(aggregateCount);

  return treeWithSlug;
}


module.exports = {
  getCategoryTree,
  getCategoryTreeWithCount
};
