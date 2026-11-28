import fs from "node:fs";
const file = "D:/saleinventory/server/routes/financialSummaryRoutes.js";

let s = fs.readFileSync(file, "utf8");

const stock = Buffer.from(
"U3RvY2sgT3V0LeCmj+CmsCDgppXgpr7gprDgpqMv4Kau4KeC4Kay4KeN4KavIOCmqOCmv+CmsOCnjeCmpuCmv+Cmt+CnjeCmn+CmreCmvuCmrOCnhyDgprngpr/gprjgpr7gpqzgpq3gp4HgppXgp43gpqQg4Kao4KefOyDgpqTgpr7gpocgTmV0IFByb2ZpdC3gpo8g4KaF4Kao4KeN4Kak4Kaw4KeN4Kat4KeB4KaV4KeN4KakIOCmleCmsOCmviDgprngp5/gpqjgpr/gpaQ=",
"base64"
).toString("utf8");

const owner = Buffer.from(
"T3duZXIgQ2FwaXRhbC9XaXRoZHJhd2FsLeCmj+CmsCDgpobgprLgpr7gpqbgpr4gTGVkZ2VyIOCmqOCnh+Cmhzsg4Kak4Ka+4KaHIE5ldCBBc3NldHMt4KaV4KeHIOCmmuCnguCnnOCmvuCmqOCnjeCmpCDgpq7gpr7gprLgpr/gppXgpr7gpqjgpr4g4Kau4KeC4Kay4Kan4KaoIOCmrOCmsuCmviDgpq/gpr7gpqzgp4cg4Kao4Ka+4KWk",
"base64"
).toString("utf8");

s = s.replace(/stockOutTreatment:\s*"[^"]*"/, "stockOutTreatment: " + JSON.stringify(stock));
s = s.replace(/ownerCapitalTreatment:\s*"[^"]*"/, "ownerCapitalTreatment: " + JSON.stringify(owner));

fs.writeFileSync(file, s, "utf8");

console.log("UTF-8 Bengali text written.");
console.log("Stock text found:", s.includes(stock));
console.log("Owner text found:", s.includes(owner));

