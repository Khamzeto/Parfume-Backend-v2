import { Request, Response } from 'express';
import perfumeModel from '../models/perfumeModel'; // Модель парфюмов
import noteModel from '../models/noteModel'; // Модель для нот

export const extractAndSaveNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    // Шаг 1: Извлекаем все парфюмы
    const perfumes = await perfumeModel.find({}, 'notes'); // Извлекаем только ноты

    let allNotes: string[] = [];

    // Шаг 2: Проходим по каждому парфюму и собираем ноты
    perfumes.forEach((perfume) => {
      const { notes } = perfume;

      if (notes) {
        const { top_notes, heart_notes, base_notes, additional_notes } = notes;
        
        // Собираем все ноты в один массив
        allNotes = [
          ...allNotes,
          ...top_notes,
          ...heart_notes,
          ...base_notes,
          ...additional_notes,
        ];
      }
    });

    // Шаг 3: Удаляем дубликаты нот
    const uniqueNotes = Array.from(new Set(allNotes.filter(Boolean))); // Убираем пустые строки и дубликаты

    // Шаг 4: Сохраняем уникальные ноты в отдельную коллекцию
    await Promise.all(
      uniqueNotes.map(async (note) => {
        try {
          // Сохраняем ноту, если её ещё нет в коллекции
          await noteModel.updateOne(
            { name: note }, // Критерий поиска
            { $setOnInsert: { name: note } }, // Добавляем ноту, если она ещё не существует
            { upsert: true } // Вставляем, если не найдено совпадений
          );
        } catch (error) {
          console.error(`Error saving note: ${note}`, error);
        }
      })
    );

    // Шаг 5: Возвращаем успешный ответ
    res.status(200).json({ message: 'Notes successfully extracted and saved', uniqueNotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to extract and save notes', error: err });
  }
};
export const getAllNotes = async (req: Request, res: Response): Promise<void> => {
    try {
      // Получаем все ноты из базы данных
      const notes = await noteModel.find({});
  
      if (notes.length === 0) {
        res.status(404).json({ message: 'No notes found' });
        return;
      }
  
      // Возвращаем список всех нот
      res.status(200).json(notes);
    } catch (error) {
      console.error('Ошибка при получении нот:', error);
      res.status(500).json({ message: 'Ошибка при получении нот' });
    }
  };
export const getNotesByInitial = async (req: Request, res: Response): Promise<void> => {
    try {
      const initial = req.params.initial.toUpperCase(); // Преобразуем букву в верхний регистр
  
      // Получаем ноты, которые начинаются на указанную букву из коллекции Note
      const notes = await noteModel.find({ name: { $regex: `^${initial}`, $options: 'i' } });
  
      if (notes.length === 0) {
        res.status(404).json({ message: `No notes found starting with ${initial}` });
        return;
      }
  
      // Возвращаем найденные ноты
      res.json(notes);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  };
  export const searchNotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.query; // Получаем поисковый запрос из параметров
  
      // Проверка наличия запроса
      if (!query || typeof query !== 'string') {
        res.status(400).json({ message: 'Query parameter is required' });
        return; // завершить выполнение функции
      }
  
      // Используем регулярное выражение для поиска нот, которые содержат запрос (case-insensitive)
      const regex = new RegExp(query, 'i');
  
      // Поиск нот, которые содержат строку запроса
      const notes = await noteModel.find({ name: { $regex: regex } });
  
      // Проверяем, были ли найдены ноты
      if (notes.length === 0) {
        res.status(404).json({ message: `No notes found matching query: ${query}` });
        return; // завершить выполнение функции
      }
  
      // Возвращаем найденные ноты
      res.status(200).json(notes);
    } catch (error) {
      console.error('Ошибка при поиске нот:', error);
      res.status(500).json({ message: 'Ошибка при поиске нот' });
    }
  };
  export const getPerfumesByNote = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy as string || 'relevance'; // Default sorting is by relevance
    const gender = req.query.gender as string; // Gender filter (optional)
  
    try {
      const noteId = req.query.noteId as string; // Получаем id ноты из параметра запроса
      if (!noteId) {
        res.status(400).json({ message: 'Note ID is required' });
        return;
      }
  
      // Проверяем, существует ли такая нота
      const noteRecord = await noteModel.findById(noteId);
      if (!noteRecord) {
        res.status(404).json({ message: 'Note not found' });
        return;
      }
  
      const noteName = noteRecord.name; // Получаем название ноты
  
      // Фильтр духов по гендеру (если указан)
      const filters: any = {
        $or: [
          { 'notes.top_notes': { $regex: `^${noteName}$`, $options: 'i' } },
          { 'notes.heart_notes': { $regex: `^${noteName}$`, $options: 'i' } },
          { 'notes.base_notes': { $regex: `^${noteName}$`, $options: 'i' } },
          { 'notes.additional_notes': { $regex: `^${noteName}$`, $options: 'i' } },
        ],
      };
  
      if (gender) {
        filters.gender = gender;
      }
  
      // Установка сортировки
      let sortCriteria: any = {};
  
      if (sortBy === 'A-Z') {
        sortCriteria = { name: 1 }; // Сортировка по названию духов от A до Z
      } else if (sortBy === 'Z-A') {
        sortCriteria = { name: -1 }; // Сортировка по названию духов от Z до A
      } else if (sortBy === 'popular') {
        sortCriteria = { rating_count: -1, rating_value: -1 }; // Сортировка по количеству отзывов и рейтингу по убыванию
      } else if (sortBy === 'unpopular') {
        sortCriteria = { rating_count: 1, rating_value: 1 }; // Сортировка по количеству отзывов и рейтингу по возрастанию
      }
  
      // Поиск духов
      const perfumes = await perfumeModel
        .find(filters)
        .sort(sortCriteria) // Применение сортировки
        .skip(skip)
        .limit(limit);
  
      const totalPerfumes = await perfumeModel.countDocuments(filters);
  
      if (perfumes.length === 0) {
        res.status(404).json({ message: 'No perfumes found for this note' });
        return;
      }
  
      // Возвращаем духи, имя ноты, и общее количество духов
      res.json({ 
        noteName, 
        perfumes, 
        total: totalPerfumes,
        count: perfumes.length  // Выводим количество парфюмов на текущей странице
      });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  };

  export const deleteNote = async (req: Request, res: Response): Promise<void> => {
    const { noteId } = req.params;
  
    try {
      // Находим и удаляем ноту
      const deletedNote = await noteModel.findByIdAndDelete(noteId);
  
      if (!deletedNote) {
        res.status(404).json({ message: 'Note not found' });
        return;
      }
  
      const noteName = deletedNote.name;
  
      // Удаляем ноту из всех парфюмов
      await perfumeModel.updateMany(
        {},
        {
          $pull: {
            'notes.top_notes': noteName,
            'notes.heart_notes': noteName,
            'notes.base_notes': noteName,
            'notes.additional_notes': noteName,
          },
        }
      );
  
      res.status(200).json({ message: `Note '${noteName}' successfully deleted` });
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete note', error: err });
    }
  };
  
  // Функция для обновления ноты
  export const updateNote = async (req: Request, res: Response): Promise<void> => {
    const { noteId } = req.params;  // Получаем ID ноты из параметров
    const { newName, newImage } = req.body;  // Получаем новые данные из тела запроса

    try {
        // Находим ноту по её ID
        const existingNote = await noteModel.findById(noteId);

        if (!existingNote) {
            res.status(404).json({ message: 'Нота не найдена' });
            return;
        }

        const oldName = existingNote.name;  // Сохраняем старое название ноты

        // Обновляем название и изображение, если новые данные переданы
        existingNote.name = newName || existingNote.name;
        existingNote.image = newImage || existingNote.image;

        // Сохраняем обновлённую ноту
        const updatedNote = await existingNote.save();

        // Если название изменилось, обновляем его в коллекции духов
        if (oldName !== newName) {
            console.log('Обновляем ноты в парфюмах с', oldName, 'на', newName);

            const updateResult = await perfumeModel.updateMany(
                {
                    $or: [
                        { 'notes.top_notes': oldName },
                        { 'notes.heart_notes': oldName },
                        { 'notes.base_notes': oldName },
                        { 'notes.additional_notes': oldName },
                    ],
                },
                {
                    $set: {
                        'notes.top_notes.$[topElem]': newName,
                        'notes.heart_notes.$[heartElem]': newName,
                        'notes.base_notes.$[baseElem]': newName,
                        'notes.additional_notes.$[additionalElem]': newName,
                    },
                },
                {
                    arrayFilters: [
                        { 'topElem': oldName },
                        { 'heartElem': oldName },
                        { 'baseElem': oldName },
                        { 'additionalElem': oldName },
                    ],
                }
            );

            console.log('Результат обновления парфюмов:', updateResult);
        }

        // Возвращаем успешный ответ
        res.status(200).json({
            message: `Нота '${oldName}' успешно обновлена на '${newName}'`,
            updatedNote,
        });
    } catch (err) {
        console.error('Ошибка при обновлении ноты:', err);
        res.status(500).json({ message: 'Не удалось обновить ноту', error: err });
    }
};

  
  
  
  export const getNoteById = async (req: Request, res: Response): Promise<void> => {
    const { noteId } = req.params;
  
    try {
      const note = await noteModel.findById(noteId);
      
      if (!note) {
        res.status(404).json({ message: 'Note not found' });
        return;
      }
  
      res.status(200).json(note);
    } catch (err) {
      res.status(500).json({ message: 'Failed to get note', error: err });
    }
  };
  
  // Функция для добавления новой ноты
  export const addNote = async (req: Request, res: Response): Promise<void> => {
    const { name, image } = req.body;
  
    try {
      const existingNote = await noteModel.findOne({ name });
  
      if (existingNote) {
        res.status(400).json({ message: 'Note with this name already exists' });
        return;
      }
  
      const newNote = new noteModel({
        name,
        image,
      });
  
      await newNote.save();
      res.status(201).json({ message: 'Note successfully added', note: newNote });
    } catch (err) {
      res.status(500).json({ message: 'Failed to add note', error: err });
    }
  };