import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import RequestModel from '../models/requestModel'; // Модель заявки

// Создание заявки
export const createRequest = async (req: Request, res: Response): Promise<void> => {
  const { perfumeId, changes } = req.body;

  try {
    const newRequest = new RequestModel({
      perfumeId,
      changes,
      status: 'pending',
    });

    await newRequest.save();
    res.status(201).json({ message: 'Заявка создана и отправлена на рассмотрение.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при создании заявки.' });
  }
};

// Получение всех заявок
export const getAllRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    // Получаем значения page и limit из запроса, задаем их по умолчанию
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Находим заявки с учетом пагинации
    const requests = await RequestModel.find()
      .populate('perfumeId')
      .skip(skip)
      .limit(limit);

    // Общее количество заявок для информации о пагинации
    const totalRequests = await RequestModel.countDocuments();
    const totalPages = Math.ceil(totalRequests / limit);

    res.json({
      requests,
      totalPages,
      currentPage: page,
      totalRequests,
    });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при получении заявок.' });
  }
};

// Одобрение заявки
export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await RequestModel.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    // Применение изменений к парфюму
    await Perfume.findByIdAndUpdate(request.perfumeId, request.changes, { new: true });
    request.status = 'approved';
    await request.save();

    res.json({ message: 'Заявка одобрена и изменения применены.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при одобрении заявки.' });
  }
};

// Отклонение заявки
export const rejectRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await RequestModel.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Заявка отклонена.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при отклонении заявки.' });
  }
};

// Удаление заявки (при отклонении или после выполнения)
export const deleteRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await RequestModel.findByIdAndDelete(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    res.json({ message: 'Заявка удалена.' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении заявки.' });
  }
};
