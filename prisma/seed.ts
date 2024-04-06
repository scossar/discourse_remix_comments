import { db } from "~/services/db.server";
import fetch from "@remix-run/react";

async function fetchDiscourseCategories() {
  console.log("this would be fetching categories");
}

fetchDiscourseCategories()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("calling the fetchDiscourseCategories function");
  });
