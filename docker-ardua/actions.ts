'use server';
import {prisma} from '@/prisma/prisma-client';
import {getUserSession} from '@/components/lib/get-user-session';
import {Prisma} from '@prisma/client';
import {hashSync} from 'bcrypt';
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
import {put, PutBlobResult} from "@vercel/blob";
import {list} from "@vercel/blob"


export async function updateUserInfo(body: Prisma.UserUpdateInput) {
  try {
    const session = await getUserSession();

    if (!session?.user?.id) {
      throw new Error("Пользователь не найден");
    }

    const userId = session.user.id;

    const findUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!findUser) {
      throw new Error("Пользователь не найден в базе данных");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: body.fullName,
        email: body.email,
        password: body.password
            ? hashSync(body.password as string, 10)
            : findUser.password,
      },
    });
  } catch (err) {
    console.error("Ошибка при обновлении информации пользователя:", err);
    throw err;
  }
}

export async function registerUser(body: Prisma.UserCreateInput) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    if (user) {
      throw new Error('Пользователь уже существует');
    }

    await prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        password: hashSync(body.password, 10),
      },
    });

  } catch (err) {
    console.log('Error [CREATE_USER]', err);
    throw err;
  }
}

export async function uploadImage(formData: FormData) {
  try {
    const imageFile = formData.get('image') as File;
    const blob = await put('nfs/' + imageFile.name, imageFile, {
      access: 'public',
    });
    //revalidatePath('/add-game');
    return blob;

  } catch (error: any) {
    if (error.code === 'P2002') {
      return {error: 'That slug already exists.'}
    }
    return {error: error.message || 'Failed to create the blog.'}
  }
}

export async function categoryCreateDateTime(data: any) {
  let category;
  let categoryNameFind;
  let userFindGameCreateTime;
  const currentTimeMinusOneHour = new Date();
  currentTimeMinusOneHour.setHours(currentTimeMinusOneHour.getHours() - 1);
  let gameTime;
  try {

    categoryNameFind = await prisma.category.findFirst({
      where: {
        name: data.name,
      }
    })
    if (categoryNameFind) {
      throw new Error('Данная категория уже существует');
    }
    console.log("111111111")
    userFindGameCreateTime = await prisma.gameCreateTime.findFirst({
      where: {
        userId: data.userId,
      }
    })

    if(!userFindGameCreateTime){
      gameTime = await prisma.gameCreateTime.create({
        data: {
         userId: Number(data.userId),
          category: currentTimeMinusOneHour,
          product: currentTimeMinusOneHour,
          productItem: currentTimeMinusOneHour,
        }
      })

      if (!gameTime) {
        throw new Error('gameTime Error');
      }
    }

    console.log("222222222")
    const currentTime = new Date();
    const lastCategoryTime = await prisma.gameCreateTime.findFirst({
      where: { userId: Number(data.userId)}, // предполагаем, что у вас есть текущий пользователь
      select: { category: true }
    });
    console.log("lastCategoryTime")
    console.log(lastCategoryTime)

    console.log("3333333333")
    // Проверяем, прошло ли больше 1 минуты
    if (lastCategoryTime && lastCategoryTime.category) {
      const timeDiff = currentTime.getTime() - new Date(lastCategoryTime.category).getTime();

      console.log("timeDiff")
      console.log(timeDiff)
      console.log(" process.env.DATE_TIME_UPDATE ")
      console.log(Number(process.env.DATE_TIME_UPDATE))
      if (timeDiff < Number(process.env.DATE_TIME_UPDATE)) { // 60000 мс = 1 минута
          throw new Error('Вы можете добавлять категории только раз в час');
      }
    }
    console.log("444444444444")
    category = await prisma.category.create({
      data: {
        name: data.name,
      }
    })

    if (!category) {
      throw new Error('Category Error');
    }

    console.log("555555555555")
    console.log(data.userId)

    const existingRecord = await prisma.gameCreateTime.findFirst({
      where: { userId: data.userId },
    });
    console.log("666666666666")
    if (!existingRecord) {
      throw new Error(`Запись с userId ${data.userId} не найдена`);
    }
    console.log("77777777")
    await prisma.gameCreateTime.update({
      where: { id: existingRecord.id }, // Используем уникальный id
      data: { category: currentTime }, // Данные для обновления
    });

    console.log("8888888")
    revalidatePath('/admin/game')

  } catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}
export async function productCreateDateTime(data: any) {
  let product;
  let productNameFind;
  let userFindGameCreateTime;
  const currentTimeMinusOneHour = new Date();
  currentTimeMinusOneHour.setHours(currentTimeMinusOneHour.getHours() - 1);

  let gameTime;
  try {

    productNameFind = await prisma.product.findFirst({
      where: {
        categoryId: data.categoryId,
        name: data.name,
      }
    })
    if (productNameFind) {
      throw new Error('Данный продукт уже существует');
    }
    console.log("111111111")
    userFindGameCreateTime = await prisma.gameCreateTime.findFirst({
      where: {
        userId: data.userId,
      }
    })

    if(!userFindGameCreateTime){
      gameTime = await prisma.gameCreateTime.create({
        data: {
          userId: Number(data.userId),
          category: currentTimeMinusOneHour,
          product: currentTimeMinusOneHour,
          productItem: currentTimeMinusOneHour,
        }
      })

      if (!gameTime) {
        throw new Error('gameTime Error');
      }
    }

    console.log("222222222")
    const currentTime = new Date();
    const lastProductTime = await prisma.gameCreateTime.findFirst({
      where: { userId: data.userId}, // предполагаем, что у вас есть текущий пользователь
      select: { product: true }
    });
    console.log("lastProductTime")
    console.log(lastProductTime)

    console.log("3333333333")
    // Проверяем, прошло ли больше 1 минуты
    if (lastProductTime && lastProductTime.product) {
      const timeDiff = currentTime.getTime() - new Date(lastProductTime.product).getTime();
      if (timeDiff < Number(process.env.DATE_TIME_UPDATE)) { // 60000 мс = 1 минута
        throw new Error('Вы можете добавлять продукты только раз в час');
      }
    }
    console.log("444444444444")
    product = await prisma.product.create({
      data: {
        name: data.name,
        categoryId: Number(data.categoryId),
      }
    })

    if (!product) {
      throw new Error('Category Error');
    }

    console.log("555555555555")
    console.log(data.userId)

    const existingRecord = await prisma.gameCreateTime.findFirst({
      where: { userId: data.userId },
    });
    console.log("666666666666")
    if (!existingRecord) {
      throw new Error(`Запись с userId ${data.userId} не найдена`);
    }
    console.log("77777777")
    await prisma.gameCreateTime.update({
      where: { id: existingRecord.id }, // Используем уникальный id
      data: { product: currentTime }, // Данные для обновления
    });

    console.log("8888888")
    revalidatePath('/admin/game')

  } catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}
export async function productItemCreateDateTime(data: any) {
  let productItem;
  let productItemNameFind;
  let userFindGameCreateTime;
  const currentTimeMinusOneHour = new Date();
  currentTimeMinusOneHour.setHours(currentTimeMinusOneHour.getHours() - 1);
  let gameTime;
  try {

    productItemNameFind = await prisma.productItem.findFirst({
      where: {
        name: data.name,
        productId: Number(data.productId),
      }
    })
    if (productItemNameFind) {
      throw new Error('Данный продукт уже существует');
    }
    console.log("111111111")
    userFindGameCreateTime = await prisma.gameCreateTime.findFirst({
      where: {
        userId: data.userId,
      }
    })

    if(!userFindGameCreateTime){
      gameTime = await prisma.gameCreateTime.create({
        data: {
          userId: Number(data.userId),
          category: currentTimeMinusOneHour,
          product: currentTimeMinusOneHour,
          productItem: currentTimeMinusOneHour,
        }
      })

      if (!gameTime) {
        throw new Error('gameTime Error');
      }
    }

    console.log("222222222")
    const currentTime = new Date();
    const lastProductItemTime = await prisma.gameCreateTime.findFirst({
      where: { userId: data.userId}, // предполагаем, что у вас есть текущий пользователь
      select: { productItem: true }
    });
    console.log("lastProductItemTime")
    console.log(lastProductItemTime)

    console.log("3333333333")
    // Проверяем, прошло ли больше 1 минуты
    if (lastProductItemTime && lastProductItemTime.productItem) {
      const timeDiff = currentTime.getTime() - new Date(lastProductItemTime.productItem).getTime();
      if (timeDiff < Number(process.env.DATE_TIME_UPDATE)) { // 60000 мс = 1 минута
        throw new Error('Вы можете добавлять категории только раз в час');
      }
    }
    console.log("444444444444")
    productItem = await prisma.productItem.create({
      data: {
        name: data.name,
        productId: Number(data.productId),
      }
    })

    if (!productItem) {
      throw new Error('Category Error');
    }

    console.log("555555555555")
    console.log(data.userId)

    const existingRecord = await prisma.gameCreateTime.findFirst({
      where: { userId: data.userId },
    });
    console.log("666666666666")
    if (!existingRecord) {
      throw new Error(`Запись с userId ${data.userId} не найдена`);
    }
    console.log("77777777")
    await prisma.gameCreateTime.update({
      where: { id: existingRecord.id }, // Используем уникальный id
      data: { productItem: currentTime }, // Данные для обновления
    });

    console.log("8888888")
    revalidatePath('/admin/game')

  } catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}

export async function categoryUpdate(data: any) {
  try {
    const findCategory = await prisma.category.findFirst({
      where: {
        id: Number(data.id),
      },
    });

    if (!findCategory) {
      throw new Error('Category non found');
    }

    // if (findCategory.name === data.name) {
    //   throw new Error('Данные не обновлены, они одинаковые.');
    // }

    await prisma.category.update({
      where: {
        id: Number(data.id),

      },
      data: {
        name: data.name,
        img: data?.img,
      },
    });

    revalidatePath('/admin/game')
  } catch (err) {
    //console.log('Error [UPDATE_CATEGORY]', err);
    throw err;
  }
}
export async function categoryCreate(data: any) {
  let category;
  let categoryNameFind;
  try {
    categoryNameFind = await prisma.category.findFirst({
      where: {
        name: data.name,
      }
    })
    if (categoryNameFind) {
      throw new Error('Данная категория уже существует');
    }

    category = await prisma.category.create({
      data: {
        name: data.name,
        img: data.img,
      }
    })

    if (!category) {
      throw new Error('Category Error');
    }

    revalidatePath('/admin/game')

  } catch (err) {
    console.log('Error [CREATE_CATEGORY]', err);
    throw err;
  }
}
export async function categoryDelete(data: any) {

  let categoryDelete;
  try {
    categoryDelete = await prisma.category.findFirst({
      where: {
        id: Number(data.id),
      },
    });

    if (!categoryDelete) {
      throw new Error('Category delete Error');
    }

    await prisma.category.delete({
      where: {
        id: Number(data.id),
      }
    })
    revalidatePath('/admin/game')
  } catch (err) {
    //console.log('Error [CREATE_CATEGORY]', err);
    throw err;
  }
}

export async function productUpdate(data: any) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: Number(data.id),
      },
    });

    if (!product) {
      throw new Error('product not found');
    }

    if (product.name === data.name) {
      throw new Error('No update, data identical.');
    }

    await prisma.product.update({
      where: {
        id: Number(data.id),
      },
      data: {
        name: data.name,
      },
    });
    revalidatePath('/admin/product')
  } catch (err) {
    //console.log('Error [UPDATE_PRODUCT]', err);
    throw err;
  }
}
export async function productDelete(data: any) {
  let product;
  try {
    product = await prisma.product.findFirst({
      where: {
        id: Number(data.id),
      },
    });
    if (!product) {
      throw new Error('Product delete Error');
    }
    await prisma.product.delete({
      where: {
        id: Number(data.id),
      }
    })
    revalidatePath('/admin/product')
  } catch (err) {
    //console.log('Error [CREATE_PRODUCT]', err);
    throw err;
  }
}
export async function productCreate(data: any) {
  let product;
  let productNameFind;
    console.log(data.name)
    console.log(data.categoryId)
  try {
    productNameFind = await prisma.product.findFirst({
      where: {
        categoryId: data.categoryId,
        name: data.name,
      }
    });

    if (productNameFind) {
      throw new Error('product already exists');
    }

    product = await prisma.product.create({
      data: {
        name: data.name,
        categoryId: Number(data.categoryId),
      }
    });

    if (!product) {
      throw new Error('Product Error');
    }

    revalidatePath('/admin/product')

  }   catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}

export async function productItemUpdate(data: any) {
  try {
    const product = await prisma.productItem.findFirst({
      where: {
        id: Number(data.id),
      },
    });

    if (!product) {
      throw new Error('product not found');
    }

    // if (product.name === data.name) {
    //   throw new Error('No update, data identical.');
    // }

    await prisma.productItem.update({
      where: {
        id: Number(data.id),
      },
      data: {
        name: data.name,
        img: data?.img,
      },
    });
    revalidatePath('/admin/product')
  } catch (err) {
    //console.log('Error [UPDATE_PRODUCT]', err);
    throw err;
  }
}
export async function productItemDelete(data : any) {
  let product;
  try {
    product = await prisma.productItem.findFirst({
      where: {
        id: Number(data.id),
      },
    });
    if (!product) {
      throw new Error('Product delete Error');
    }
    console.log(Number(data.id))
    await prisma.productItem.delete({
      where: {
        id: Number(data.id),
      }
    })
    revalidatePath('/admin/product-item')
  } catch (err) {
    //console.log('Error [CREATE_PRODUCT]', err);
    throw err;
  }
}
export async function productItemCreate(data: any) {
  let product;
  let productNameFind;
  try {
    productNameFind = await prisma.productItem.findFirst({
      where: {
        name: data.name,
        productId: Number(data.productId),
      }
    });

    if (productNameFind) {
      throw new Error('product already exists');
    }else {
      product = await prisma.productItem.create({
        data: {
          name: data.name,
          productId: Number(data.productId),
          img:data?.img,
        }
      });
      if (!product) {
        throw new Error('Product Error');
      }
    }

    revalidatePath('/admin/product')
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}

export async function addRecordActions(data :any) {

  try {
    console.log("data.carModelId");
    console.log(data.carModelId);
    await prisma.gameRecords.create({
        data: {
          userId: data.userId,
          categoryId: data.categoryId,
          productId: data.productId,
          productItemId: data.productItemId,
          timestate: data.timestate,
          video: data.video,
          img: data.img,
          carModelId: data.carModelId,
        }
      });

    revalidatePath('/')

  } catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}

export async function editRecordActions(data :any) {

  let result;
  try {
    result = await prisma.gameRecords.findFirst({
      where: {
        id: data.id,
        userId: data.userId,
        categoryId: data.categoryId,
        productId: data.productId,
        productItemId: data.productItemId,
      }
    })

    if (!result) {
      throw new Error('editRecordActions result not found');
    }

    console.log("data");
    console.log(data);

    await prisma.gameRecords.update({
      where: {
        id: data.id,
        userId: data.userId,
        categoryId: data.categoryId,
        productId: data.productId,
        productItemId: data.productItemId,
      },
      data: {
        timestate: data?.timestate,
        video: data?.video,
        img: data?.img,
        carModelId: data?.carModelId,
      },
    });

    revalidatePath('/admin/edit-game')
  }catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}

export async function deleteRecordActions(data :any) {
  let record;
  console.log('data data data data')
  console.log(data.id)
  try {
    record = await prisma.gameRecords.findFirst({
      where: {
        id: data.id,
      },
    });
    if (!record) {
      throw new Error('recordGame not found');
    }
    console.log('1111111111111111111')
    await prisma.gameRecords.delete({
      where: {
        id: data.id,
      }
    })
    revalidatePath('/edit-game')
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.stack);
    }
    throw new Error('Failed to game your interaction. Please try again.');
  }
}

