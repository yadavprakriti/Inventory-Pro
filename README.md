# Inventory and Data Management System

Node.js + Express + MongoDB (Mongoose) + dotenv

## Run
1. Start MongoDB locally (or put an Atlas URI in `.env`)
2. `npm install`
3. `npm start`  → http://localhost:5000

## Endpoints
| Method | URL | Description |
|---|---|---|
| POST | /api/products | Create product |
| GET | /api/products | List (filter, sort, paginate) |
| GET | /api/products/:id | Single product |
| PUT | /api/products/:id | Update details |
| PATCH | /api/products/:id/stock | Body `{"change": 10}` restock, `{"change": -5}` sale |
| DELETE | /api/products/:id | Delete |
| GET | /api/products/low-stock | quantity <= reorderLevel |
| GET | /api/products/summary | Category-wise aggregation |

### Query examples
`/api/products?category=Furniture&minPrice=1000&maxPrice=5000&sort=price:desc&page=1&limit=5&search=table`

### Sample POST body
```json
{ "name": "Gel Pen Pack of 15", "sku": "STNY-PN-713", "category": "Stationery",
  "price": 120, "quantity": 40, "reorderLevel": 20, "supplier": "Cello Pens" }
```
