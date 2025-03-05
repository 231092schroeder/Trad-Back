const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Consumer = require('../models/User');
const Provider = require('../models/Provider');
const authenticateToken = require('../controllers/auth.middleware');
const Request = require('../models/Request');
const Progress = require('../models/Progress');
const Completed = require('../models/Completed');
const Message = require('../models/Message');
const { deleteRequest } = require('../controllers/requests.controller');
const mongoose = require('mongoose');
const User = require('../models/User');
const stripe = require('stripe')('sk_test_51MQETwLkVN3h92cABO5TRGyQTXLoHYmexbzYICzVU8HIQQ4KAhngWGrEOViJHhbQDOWL3M2Zo0RTOwfXddQvtUZQ002DAzi1Lc');
const { ObjectId } = require('mongodb');

async function checkIfRequestExists(consumerId, providerId) {
  const request = await Request.findOne({
    consumerId,
    providerId,
    status: 'approved', // ou outro status que indique que a solicitação foi aceita
  });

  return !!request; // Retorna `true` se existir, `false` caso contrário
}

const findUserByEmail = async (email) => {
  let user = await Consumer.findOne({ email });
  if (!user) {
    user = await Provider.findOne({ email });
  }
  return user;
};

// Rota de login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for email: ${email}`);

  const user = await findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const token = jwt.sign({
    _id: user._id,
    email: user.email,
    role: user.role
  }, 'sua_chave_secreta', { expiresIn: '1h' });
  res.json({
    token,
    role: user.role,
    userId: user._id,
    name: user.name,  
    surname: user.surname
  });
});

// Proteger paginas para apenas autenticados
router.get('/dashboardc-data', authenticateToken, (req, res) => {
  res.json({ message: 'Dados carregados com sucesso', user: req.user });
});


// Rota para registro
router.post('/register', async (req, res) => {
  console.log(req.body); // Verifique o que está sendo enviado

  const { name, surname, email, dob, phone, password, role, languages } = req.body;

  try {
    if (role === 'consumer') {
      // Registrar como consumidor
      const newConsumer = new Consumer({ name, surname, email, dob, phone, password });
      await newConsumer.save();
      res.status(201).json({ message: 'Consumer registered successfully' });
    } else if (role === 'provider') {
      // Registrar como fornecedor
      const newProvider = new Provider({ name, surname, email, dob, phone, password, role, languages });
      await newProvider.save();
      res.status(201).json({ message: 'Provider registered successfully' });
    } else {
      res.status(400).json({ message: 'Invalid role' });
    }
  } catch (error) {
    console.error("Error while registering user:", error); // Log completo do erro
    res.status(500).json({ message: 'Server error', error: error.message }); // Adiciona o erro na resposta
  }

  // Atualizar dados do usuário
  router.put('/update', authenticateToken, async (req, res) => {
    const { phone, languages, password } = req.body;

    try {
      const user = await Provider.findOne({ email: req.user.email });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Não permite alterar nome, sobrenome, e email
      if (phone) user.phone = phone;
      if (languages) user.languages = languages;

      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();

      res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
});

// Rota para incluir solicitação de serviço
router.post('/requests', authenticateToken, async (req, res) => {
  console.log('Dados recebidos:', req.body);
  const { type, sourceLanguage, targetLanguage, pricePerPage, pageCount, totalPrice, documentUrl, originalText, translatedText, correctedText, originalLanguage } = req.body;

  if (!type || !sourceLanguage || !targetLanguage || !pricePerPage || !pageCount || !totalPrice) {
    return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
  }

  try {
    const newRequest = await Request.create({
      userId: req.user._id,
      type,
      sourceLanguage,
      targetLanguage,
      pricePerPage,
      pageCount,
      totalPrice,
      documentUrl,
      originalText,
      translatedText: type === 'traduction' ? translatedText : undefined, // Apenas para tradução
      correctedText: type === 'correction' ? correctedText : undefined, // Apenas para correção
      originalLanguage,
      status: 'Pending payment',
      createdAt: new Date(),
    });

    const user = await Consumer.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    user.requests.push(newRequest._id);
    await user.save();

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ message: 'Erro ao criar solicitação' });
  }
});

router.put('/:id/status', async (req, res) => {
  console.log(`📌 PUT recebido para ID: ${req.params.id}`);
  console.log(`📌 Novo status: ${req.body.status}`);

  try {
    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!updatedRequest) {
      console.log('⚠️ Request não encontrada no banco de dados:', req.params.id);
      return res.status(404).json({ message: 'Request not found' });
    }

    console.log('✅ Request atualizada:', updatedRequest);
    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


//Rota para buscas formulario no back
router.get('/requests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isCart } = req.query;  // Obtém o parâmetro da URL

    // Filtra solicitações apenas se for da página de carrinho
    let requests;
    if (isCart === 'true') {
      // Aplica o filtro apenas se isCart for 'true'
      requests = await Request.find({ userId, status: "Pending payment" });
    } else {
      // Caso contrário, retorna todas as solicitações do usuário
      requests = await Request.find({ userId });
    }

    const progresses = await Progress.find({ userId });

    // Unir os arrays de pedidos
    const allRequests = [...requests, ...progresses];

    res.status(200).json(allRequests);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar solicitações', error });
  }
});



//Rota para excluir formulario do backend
router.delete('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Tentando excluir a solicitação com ID:', req.params.id);
    const deletedRequest = await Request.findByIdAndDelete(id);

    if (!deletedRequest) {
      console.log('Solicitação não encontrada.');
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }
    console.log('Solicitação excluída:', deletedRequest);
    res.status(200).json({ message: 'Solicitação excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir a solicitação:', error);
    res.status(500).json({ message: 'Erro ao excluir solicitação.', error });
  }
});

// Rota para recuperar solicitações do usuário
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const user = await Consumer.findById(req.user.id) || await Provider.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({
      userId: user._id,
      name: user.name,
      surname: user.surname,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter informações do usuário' });
  }
});

//payment
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { cartItems } = req.body;

    // Mapear os itens do carrinho para o formato do Stripe
    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.type,
          description: `De ${item.sourceLanguage} para ${item.targetLanguage} - ${item.pageCount} páginas`,
        },
        unit_amount: Math.round(item.totalPrice * 100), // Preço em centavos
      },
      quantity: 1,
    }));

    // Criar a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:4200/cart?payment=success',
      cancel_url: 'http://localhost:4200/cart',
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento.' });
  }
});

router.post('/assign-provider', async (req, res) => {
  try {
    console.log('Recebendo pedido para atribuir um provedor:', JSON.stringify(req.body, null, 2));

    const { cartItems } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      console.error('Erro: Nenhum item no carrinho para processar.');
      return res.status(400).json({ error: 'Nenhum item no carrinho para processar.' });
    }

    for (const item of cartItems) {
      let { _id, sourceLanguage, targetLanguage, userId } = item;

      if (!_id || !ObjectId.isValid(_id)) {
        console.error(`Erro: O pedido não tem um _id válido: ${JSON.stringify(item)}`);
        continue;
      }

      try {
        // 🔹 Normaliza os idiomas para garantir a comparação correta
        sourceLanguage = sourceLanguage.trim().toLowerCase();
        targetLanguage = targetLanguage.trim().toLowerCase();

        // 🔹 Buscar um provider que tenha os dois idiomas na sua lista `languages`
        const provider = await Provider.findOne({
          languages: {
            $all: [
              new RegExp(`^${sourceLanguage}$`, 'i'),
              new RegExp(`^${targetLanguage}$`, 'i')
            ]
          }
        });

        if (!provider) {
          console.warn(`Nenhum provedor encontrado para o pedido ${_id}`);
          continue;
        }

        console.log(`✅ Atribuindo provider ${provider._id} ao pedido ${_id}`);

        // 🔹 Atualiza o pedido no banco de dados garantindo que providerId e consumerId sejam armazenados
        const result = await Request.findOneAndUpdate(
          { _id: new ObjectId(_id) },
          {
            $set: {
              providerId: provider._id,
              consumerId: userId,
              status: 'Pending payment'
            }
          },
          { new: true, upsert: false } // Garante que apenas atualiza sem criar um novo registro
        );

        if (!result) {
          console.warn(`⚠️ Nenhum pedido encontrado com _id ${_id}`);
        } else {
          console.log(`✅ Pedido ${_id} atualizado com sucesso no banco de dados.`);
        }
      } catch (err) {
        console.error(`❌ Erro ao processar pedido ${_id}:`, err);
      }
    }

    res.status(200).json({ message: '✅ Pedidos atualizados com provedor atribuído!' });
  } catch (error) {
    console.error('❌ Erro ao atribuir provedor:', error);
    res.status(500).json({ error: 'Erro ao processar a atribuição do provedor.' });
  }
});


router.get('/get-provider-requests/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    console.log('Provider ID recebido:', providerId);

    if (!ObjectId.isValid(providerId)) {
      return res.status(400).json({ error: 'ID do provedor inválido' });
    }

    const providerRequests = await Request.find({
      providerId: new ObjectId(providerId),
    });
    console.log('Pedidos encontrados:', providerRequests);
    res.status(200).json(providerRequests);
  } catch (error) {
    console.error('Erro ao buscar pedidos do provider:', error);
    res.status(500).json({ error: 'Erro ao carregar pedidos do provider.' });
  }
});

//in progress
// Aceitar pedido e mover para "progress"
router.post('/accept-request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'ID do pedido inválido' });
    }

    // Buscar o pedido na coleção requests
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Criar um novo documento na coleção progress
    const newProgress = new Progress({
      ...request.toObject(), // Copia todos os dados do pedido
      status: 'Em andamento', // Atualiza o status do pedido
      startedAt: new Date(), // Marca o início do trabalho
    });

    // Salvar na coleção progress
    await newProgress.save();

    // Remover o pedido da coleção requests
    await Request.findByIdAndDelete(requestId);

    res.status(200).json({ message: 'Pedido aceito e movido para progresso.', newProgress });
  } catch (error) {
    console.error('Erro ao aceitar pedido:', error);
    res.status(500).json({ error: 'Erro ao processar o pedido.' });
  }
});

router.get('/get-accept-requests/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    console.log('Provider ID recebido:', providerId);

    if (!ObjectId.isValid(providerId)) {
      return res.status(400).json({ error: 'ID do provedor inválido' });
    }

    const providerProgress = await Progress.find({
      providerId: new ObjectId(providerId),
    });
    console.log('Pedidos encontrados:', providerProgress);
    res.status(200).json(providerProgress);
  } catch (error) {
    console.error('Erro ao buscar pedidos do provider:', error);
    res.status(500).json({ error: 'Erro ao carregar pedidos do provider.' });
  }
});

//Fazer correção de texto e salvar no progresses
router.put('/progress/:id', async (req, res) => {
  const { id } = req.params;
  const { translatedText } = req.body;

  console.log("Recebendo requisição para atualização:", { id, translatedText });

  if (!translatedText) {
    return res.status(400).json({ message: "Campo translatedText é obrigatório!" });
  }

  try {
    const updatedProgress = await Progress.findByIdAndUpdate(id, { translatedText }, { new: true });

    if (!updatedProgress) {
      return res.status(404).json({ message: "Progresso não encontrado" });
    }

    res.json(updatedProgress);
  } catch (error) {
    console.error("Erro no backend:", error);
    res.status(500).json({ message: "Erro ao atualizar progresso", error });
  }
});

//Completed
router.put('/progress/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar o pedido na coleção Progress
    const progressOrder = await Progress.findById(id);

    if (!progressOrder) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    // Criar um novo documento na coleção Completed
    const completedOrder = new Completed({
      ...progressOrder.toObject(),
      completedAt: new Date(),
      status: 'Completed'
    });

    await completedOrder.save(); // Salvar no banco

    // Remover da coleção Progress
    await Progress.findByIdAndDelete(id);

    res.json({ message: "Pedido concluído e transferido para Completed", completedOrder });
  } catch (error) {
    console.error("Erro ao completar pedido:", error);
    res.status(500).json({ message: "Erro ao completar pedido", error });
  }
});


//messenger
// Enviar mensagem
router.post('/messages/send', async (req, res) => {
  const { consumerId, providerId, senderId, text } = req.body;

  console.log('Dados recebidos no backend:', { consumerId, providerId, senderId, text });

  
  if (!consumerId || !providerId || !senderId || !text) {
    return res.status(400).json({ success: false, message: 'Todos os parâmetros são obrigatórios' });
  }

  try {
    const message = new Message({ userId, providerId, senderId, text });
    await message.save();
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error });
  }
});

// Buscar mensagens ordenadas por data
router.get('/messages/:consumerId/:providerId', async (req, res) => {
  const { consumerId, providerId } = req.params;

  // Verificar se os parâmetros são válidos
  if (!consumerId || !providerId) {
    return res.status(400).json({ success: false, message: 'ConsumerId e ProviderId são obrigatórios' });
  }

  try {
    // Verificar se os IDs são válidos antes de tentar convertê-los
    if (!mongoose.Types.ObjectId.isValid(consumerId) || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: 'IDs inválidos' });
    }

    // Caso os IDs sejam válidos, você pode buscar diretamente sem necessidade de nova conversão
    const messages = await Message.find({
      $or: [
        { userId: consumerObjectId, providerId: providerObjectId },
        { providerId: consumerObjectId, userId: providerObjectId }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ success: false, error });
  }
});


module.exports = router; // Exporte o roteador
