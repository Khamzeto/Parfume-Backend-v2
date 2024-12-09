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
// Одобрение заявки
export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await RequestModel.findById(req.params.id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    if (!request.perfumeId) {
      res.status(400).json({ message: 'Заявка не содержит идентификатор парфюма.' });
      return;
    }

    // Применение изменений к парфюму
    const updatedPerfume = await Perfume.findByIdAndUpdate(
      request.perfumeId,
      request.changes,
      { new: true }
    );

    if (!updatedPerfume) {
      res.status(404).json({ message: 'Парфюм не найден.' });
      return;
    }

    request.status = 'approved';
    await request.save();

    res.json({ message: 'Заявка одобрена и изменения применены.' });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      console.error('Ошибка валидации:', err);
      res.status(400).json({ message: 'Ошибка валидации данных.', details: err.errors });
    } else {
      console.error('Ошибка в approveRequest:', err);
      res.status(500).json({ message: 'Ошибка при одобрении заявки.' });
    }
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

    if (!request.perfumeId) {
      res.status(400).json({ message: 'Заявка не содержит идентификатор парфюма.' });
      return;
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Заявка отклонена.' });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      console.error('Ошибка валидации:', err);
      res.status(400).json({ message: 'Ошибка валидации данных.', details: err.errors });
    } else {
      console.error('Ошибка в rejectRequest:', err);
      res.status(500).json({ message: 'Ошибка при отклонении заявки.' });
    }
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
    // Находим только одобренные заявки пользователя
    const requests = await RequestModel.find({ userId, status: 'approved' })
      .sort({ createdAt: -1 })
      .select('createdAt updatedAt perfumeId changes'); // Подключаем changes для получения name и brand

    if (requests.length === 0) {
      res
        .status(404)
        .json({ message: 'Одобренные заявки не найдены для данного пользователя.' });
      return;
    }

    // Формируем ответ, добавляя `name` и `brand` из `changes`, если они там есть
    const requestsWithPerfumeInfo = requests.map(request => ({
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      image: request.changes?.main_image,
      perfumeId: request.changes?.perfume_id,
      perfumeName: request.changes?.name, // Берем name из changes
      perfumeBrand: request.changes?.brand, // Берем brand из changes
    }));

    res.json({ requests: requestsWithPerfumeInfo });
  } catch (err) {
    console.error('Ошибка при получении одобренных заявок пользователя:', err);
    res
      .status(500)
      .json({ message: 'Ошибка при получении одобренных заявок пользователя.' });
  }
};
// Удаление всех заявок
export const deleteAllRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const deletedCount = await RequestModel.deleteMany({});
    res.json({
      message: `Все заявки удалены (${deletedCount.deletedCount}).`,
    });
  } catch (err) {
    console.error('Ошибка при удалении всех заявок:', err);
    res.status(500).json({ message: 'Ошибка при удалении всех заявок.' });
  }
};
// Обновление заявки
export const updateRequest = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { changes } = req.body; // Новые изменения, которые нужно сохранить

  try {
    const request = await RequestModel.findById(id);
    if (!request) {
      res.status(404).json({ message: 'Заявка не найдена.' });
      return;
    }

    // Обновляем поля заявки
    request.changes = { ...request.changes, ...changes };
    request.updatedAt = new Date();

    await request.save();

    res.json({ message: 'Заявка успешно обновлена.', request });
  } catch (err) {
    console.error('Ошибка при обновлении заявки:', err);
    res.status(500).json({ message: 'Ошибка при обновлении заявки.' });
  }
};
