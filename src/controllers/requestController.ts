import { Request, Response } from 'express';
import Perfume from '../models/perfumeModel';
import RequestModel from '../models/requestModel'; // Модель заявки

// Создание заявки
export const createRequest = async (req: Request, res: Response): Promise<void> => {
  const { perfumeId, changes, userId } = req.body; // Получаем userId из тела запроса

  try {
    const newRequest = new RequestModel({
      perfumeId,
      userId, // Сохраняем userId
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

    // Находим заявки с учетом пагинации и сортировки по createdAt (последние раньше)
    const requests = await RequestModel.find()
      .populate('perfumeId')
      .sort({ createdAt: -1 }) // Сортировка по убыванию времени создания
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
export const getApprovedRequestsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;

  try {
    // Находим только одобренные заявки пользователя и получаем только необходимые поля
    const requests = await RequestModel.find({ userId, status: 'approved' })
      .sort({ createdAt: -1 })
      .select('changes createdAt updatedAt');

    if (requests.length === 0) {
      res
        .status(404)
        .json({ message: 'Одобренные заявки не найдены для данного пользователя.' });
      return;
    }

    // Извлекаем уникальные perfume_id из заявок
    const perfumeIds = requests.map(request => request.perfumeId);

    // Находим соответствующие парфюмы по perfume_id и берем только нужные поля name и brand
    const perfumes = await Perfume.find(
      { perfume_id: { $in: perfumeIds } },
      'name brand perfume_id'
    );

    // Создаем карту для быстрого доступа к парфюмам по perfume_id
    const perfumeMap = perfumes.reduce((map, perfume) => {
      map[perfume.perfume_id] = perfume;
      return map;
    }, {} as Record<string, { name: string; brand: string }>);

    // Добавляем имя и бренд парфюма к каждой заявке, исключая ненужные поля
    const requestsWithPerfumeInfo = requests.map(request => ({
      changes: request.changes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      perfumeName: perfumeMap[request.perfumeId]?.name,
      perfumeBrand: perfumeMap[request.perfumeId]?.brand,
    }));

    res.json({ requests: requestsWithPerfumeInfo });
  } catch (err) {
    console.error('Ошибка при получении одобренных заявок пользователя:', err);
    res
      .status(500)
      .json({ message: 'Ошибка при получении одобренных заявок пользователя.' });
  }
};
