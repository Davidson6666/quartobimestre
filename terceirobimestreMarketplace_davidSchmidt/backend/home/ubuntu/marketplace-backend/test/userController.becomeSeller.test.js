jest.mock("../config/database");
const db = require("../config/database");
const userController = require("../controllers/userController");

// Helpers to create mock req/res
const makeReq = (user, body = {}) => ({ user, body });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("becomeSeller controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("success: creates a new vendedor when none exists", async () => {
    const req = makeReq({ id: 1, tipo: "comprador" }, { sigla: "lojaLegal" });
    const res = makeRes();
    const next = jest.fn();

    // Mock DB calls in order:
    // 1) SELECT id, sigla FROM vendedores WHERE usuario_id = $1 -> no rows
    // 2) SELECT 1 FROM vendedores WHERE LOWER(sigla) = LOWER($1) -> rowCount 0
    // 3) INSERT INTO vendedores -> returns new vendedor
    // 4) UPDATE usuarios SET tipo = 'ambos' -> return
    db.query.mockImplementation((sql, params) => {
      if (/FROM vendedores WHERE usuario_id/i.test(sql))
        return Promise.resolve({ rows: [] });
      if (/LOWER\(sigla\)/i.test(sql)) return Promise.resolve({ rowCount: 0 });
      if (/INSERT INTO vendedores/i.test(sql))
        return Promise.resolve({
          rows: [{ id: 99, usuario_id: 1, sigla: "lojalegal", ativo: true }],
        });
      if (/UPDATE usuarios SET tipo/i.test(sql))
        return Promise.resolve({ rows: [{ id: 1, tipo: "ambos" }] });
      return Promise.resolve({ rows: [] });
    });

    await userController.becomeSeller(req, res, next);

    // success case

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("error: already has vendedor with sigla", async () => {
    const req = makeReq({ id: 2, tipo: "ambos" }, { sigla: "minha" });
    const res = makeRes();
    const next = jest.fn();

    db.query.mockImplementation((sql, params) => {
      if (/FROM vendedores WHERE usuario_id/i.test(sql))
        return Promise.resolve({ rows: [{ id: 5, sigla: "shop" }] });
      return Promise.resolve({ rows: [] });
    });

    await userController.becomeSeller(req, res, next);

    // already-seller case

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test("error: sigla already in use", async () => {
    const req = makeReq({ id: 3, tipo: "comprador" }, { sigla: "duplicada" });
    const res = makeRes();
    const next = jest.fn();

    db.query.mockImplementation((sql, params) => {
      if (/FROM vendedores WHERE usuario_id/i.test(sql))
        return Promise.resolve({ rows: [] });
      if (/LOWER\(sigla\)/i.test(sql)) return Promise.resolve({ rowCount: 1 });
      return Promise.resolve({ rows: [] });
    });

    await userController.becomeSeller(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test("error: invalid sigla format", async () => {
    const req = makeReq({ id: 4, tipo: "comprador" }, { sigla: "a" });
    const res = makeRes();
    const next = jest.fn();

    await userController.becomeSeller(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});
