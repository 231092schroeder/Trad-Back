const Request = require('../models/Request'); // Substitua pelo caminho correto do modelo

const deleteRequest = async (req, res) => {
  try {
    const requestId = req.params.id;

    // Verifique se o ID foi passado
    if (!requestId) {
      return res.status(400).json({ message: 'ID da solicitação não fornecido' });
    }

    // Remova a solicitação do banco de dados
    const result = await Request.findByIdAndDelete(requestId);

    if (!result) {
      return res.status(404).json({ message: 'Solicitação não encontrada' });
    }

    res.status(200).json({ message: 'Solicitação excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir a solicitação' });
  }
};

module.exports = { deleteRequest };
