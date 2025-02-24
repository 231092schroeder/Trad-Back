const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const JWT_SECRET = 'sua_chave_secreta';

let users = []; // Simulando banco de dados para testes

// Registro
exports.register = async (req, res) => {
  const { name, surname, email, dob, phone, password, role, languages, court } = req.body;

  if (users.find(user => user.email === email)) {
    return res.status(400).json({ message: 'Email já cadastrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { name, surname, email, dob, phone, password: hashedPassword, role, languages, court };
  users.push(newUser);

  res.status(201).json({ message: 'Usuário registrado com sucesso', user: newUser });
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, role: user.role });
};

// Remover solicitação do consumer
exports.deleteRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    // Verifica se a solicitação existe
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Solicitação não encontrada' });
    }

    // Remove a solicitação do banco de dados
    await Request.findByIdAndDelete(requestId);

    res.status(200).json({ message: 'Solicitação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir a solicitação:', error);
    res.status(500).json({ message: 'Erro ao excluir a solicitação' });
  }
};