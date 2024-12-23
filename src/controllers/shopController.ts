// controllers/shopController.ts
import { Request, Response } from 'express';
import Shop, { IShop } from '../models/shopModel';

// Получить все магазины
export const getAllShops = async (req: Request, res: Response): Promise<void> => {
  try {
    const shops = await Shop.find();
    res.status(200).json(shops);
  } catch (error) {
    res
      .status(500)
      .json({
        message: 'Ошибка сервера',
        error: error instanceof Error ? error.message : error,
      });
  }
};

// Получить магазин по ID
export const getShopById = async (req: Request, res: Response): Promise<void> => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      res.status(404).json({ message: 'Магазин не найден' });
      return;
    }
    res.status(200).json(shop);
  } catch (error) {
    res
      .status(500)
      .json({
        message: 'Ошибка сервера',
        error: error instanceof Error ? error.message : error,
      });
  }
};

// Создать новый магазин
export const createShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, url, location, rating, image } = req.body;
    const newShop: IShop = new Shop({ name, url, location, rating, image });
    await newShop.save();
    res.status(201).json(newShop);
  } catch (error) {
    res
      .status(500)
      .json({
        message: 'Ошибка при создании магазина',
        error: error instanceof Error ? error.message : error,
      });
  }
};

// Обновить данные магазина по ID
export const updateShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, url, location, rating, image } = req.body;
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { name, url, location, rating, image },
      { new: true }
    );
    if (!shop) {
      res.status(404).json({ message: 'Магазин не найден' });
      return;
    }
    res.status(200).json(shop);
  } catch (error) {
    res
      .status(500)
      .json({
        message: 'Ошибка при обновлении данных магазина',
        error: error instanceof Error ? error.message : error,
      });
  }
};

// Удалить магазин по ID
export const deleteShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) {
      res.status(404).json({ message: 'Магазин не найден' });
      return;
    }
    res.status(200).json({ message: 'Магазин удален' });
  } catch (error) {
    res
      .status(500)
      .json({
        message: 'Ошибка при удалении магазина',
        error: error instanceof Error ? error.message : error,
      });
  }
};
