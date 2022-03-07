import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const localStorageKey = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(localStorageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateLocalStorage = (cartNewValue: Product[]) => localStorage.setItem(localStorageKey, JSON.stringify(cartNewValue));

  const getProductById = async (productId: number) => api.get<Product>(`products/${productId}`);

  const productHasStock = async (productId: number, amountToAdd: number) => {
    var stock = (await api.get<Stock>(`stock/${productId}`)).data;

    return stock.amount >= amountToAdd;
  }

  const productExists = async (productId: number) => {

    try {
      var response = await api.get<Stock>(`stock/${productId}`);

      if (response.data)
        return true;
      else
        return false;
    } catch {
      return false;
    }

  }

  const addProduct = async (productId: number) => {
    try {

      if (!await productExists(productId))
        throw new Error('Produto não encontrado');

      let product = cart.find(x => x.id === productId);

      if (!product) {
        if (await productHasStock(productId, 1)) {

          product = (await getProductById(productId)).data;
          product.amount = 1;
          
          const cartNewValue = [...cart, product];
          setCart(cartNewValue);
          
          updateLocalStorage(cartNewValue);
          
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }

      } else {
        updateProductAmount({ productId, amount: product.amount + 1 })
      }
    }
    catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      let productIndex = cart.findIndex(x => x.id === productId);

      if (productIndex === -1)
        throw new Error('Produto não encontrado');

      let cartCopy = [...cart];

      cartCopy.splice(productIndex, 1);

      setCart(cartCopy);
      updateLocalStorage(cartCopy);

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount < 1)
      throw new Error('Produto não pode ter quantidade menor que 1');

      let productIndex = cart.findIndex(x => x.id === productId);

      if (productIndex === -1)
        throw new Error('Produto não encontrado');

      if (await productHasStock(productId, amount)) {

        let cartCopy = [...cart];

        cartCopy[productIndex].amount = amount

        setCart(cartCopy);
        updateLocalStorage(cartCopy);
      }
      else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
