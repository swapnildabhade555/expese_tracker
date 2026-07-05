import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const PORT = process.env.PORT || 5002;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Tracker API Docs',
      version: '1.0.0',
      description: 'API Documentation for the Expense Tracker application, including Authentication, Category Management, Expense Tracking, and Recurring Expenses.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: <token_value> to authorize calls.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            icon: { type: 'string' },
            isDefault: { type: 'boolean' },
            userId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR' },
            convertedAmount: { type: 'number' },
            date: { type: 'string', format: 'date-time' },
            categoryId: { type: 'string', format: 'uuid' },
            paidById: { type: 'string', format: 'uuid' },
            groupId: { type: 'string', format: 'uuid', nullable: true },
            recurringExpenseId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        RecurringExpense: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR' },
            startDate: { type: 'string', format: 'date-time' },
            nextDueDate: { type: 'string', format: 'date-time' },
            interval: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
            categoryId: { type: 'string', format: 'uuid' },
            paidById: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CategoryBudget: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            limit: { type: 'number' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR' },
            userId: { type: 'string', format: 'uuid' },
            categoryId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MonthlyBudget: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            limit: { type: 'number' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR' },
            userId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.js'], // Backup: scan jsdocs if added later
};

const specs = swaggerJSDoc(options);

// Define manual route definitions so swagger UI is 100% populated out-of-the-box
specs.paths = {
  '/api/auth/signup': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      security: [], // Public
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password', 'passwordConfirm'],
              properties: {
                name: { type: 'string', example: 'Jane Doe' },
                email: { type: 'string', example: 'jane@example.com' },
                password: { type: 'string', example: 'strongpassword123' },
                passwordConfirm: { type: 'string', example: 'strongpassword123' },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR', example: 'INR' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  message: { type: 'string', example: 'User registered successfully. Please log in to continue.' },
                  data: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Log in an existing user',
      security: [], // Public
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'jane@example.com' },
                password: { type: 'string', example: 'strongpassword123' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token (Refresh Token Rotation)',
      security: [], // Public
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string', example: 'random-hex-string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'New tokens generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        401: {
          description: 'Refresh token is invalid or has expired',
        },
      },
    },
  },
  '/api/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Log out a user (invalidates refresh token)',
      security: [], // Public
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string', example: 'random-hex-string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  message: { type: 'string', example: 'Logged out successfully.' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/auth/profile': {
    patch: {
      tags: ['Authentication'],
      summary: 'Update user profile (e.g. name, home currency preference)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Jane Newname' },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], example: 'USD' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Profile updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/categories': {
    get: {
      tags: ['Categories'],
      summary: 'Get all default categories and custom user categories',
      responses: {
        200: {
          description: 'List of categories',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  results: { type: 'integer', example: 10 },
                  data: {
                    type: 'object',
                    properties: {
                      categories: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Category' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Categories'],
      summary: 'Create a custom category',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', example: 'Office Expenses' },
                icon: { type: 'string', example: '💼' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Custom category created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  data: {
                    type: 'object',
                    properties: {
                      category: { $ref: '#/components/schemas/Category' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/categories/{id}': {
    patch: {
      tags: ['Categories'],
      summary: 'Update a custom category',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'New Category Name' },
                icon: { type: 'string', example: '📁' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Category updated',
        },
      },
    },
    delete: {
      tags: ['Categories'],
      summary: 'Delete a custom category',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        204: {
          description: 'Category deleted',
        },
      },
    },
  },
  '/api/expenses': {
    get: {
      tags: ['Expenses'],
      summary: "Get all user's personal expenses with filters",
      description: 'Automatically triggers background check and catchup of due recurring expenses.',
      parameters: [
        { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'minAmount', in: 'query', schema: { type: 'number' } },
        { name: 'maxAmount', in: 'query', schema: { type: 'number' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'date:desc' } },
        { name: 'targetCurrency', in: 'query', schema: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] }, description: 'Convert results to this target currency' },
      ],
      responses: {
        200: {
          description: 'Filtered expenses list',
        },
      },
    },
    post: {
      tags: ['Expenses'],
      summary: 'Record a new expense',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['description', 'amount', 'categoryId'],
              properties: {
                description: { type: 'string', example: 'Coffee with client' },
                amount: { type: 'number', example: 4.5 },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR', example: 'USD' },
                date: { type: 'string', format: 'date-time' },
                categoryId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Expense recorded',
        },
      },
    },
  },
  '/api/expenses/summary': {
    get: {
      tags: ['Expenses'],
      summary: 'Get aggregate analytics summary',
      description: 'Automatically triggers background check and catchup of due recurring expenses.',
      parameters: [
        { name: 'targetCurrency', in: 'query', schema: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] }, description: 'Target currency for calculations' },
      ],
      responses: {
        200: {
          description: 'Summary object',
        },
      },
    },
  },
  '/api/expenses/{id}': {
    get: {
      tags: ['Expenses'],
      summary: 'Get single expense details',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Expense object',
        },
      },
    },
    patch: {
      tags: ['Expenses'],
      summary: 'Update an expense',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] },
                date: { type: 'string', format: 'date-time' },
                categoryId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Expense updated',
        },
      },
    },
    delete: {
      tags: ['Expenses'],
      summary: 'Delete an expense',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        204: {
          description: 'Expense deleted',
        },
      },
    },
  },
  '/api/expenses/recurring': {
    get: {
      tags: ['Recurring Expenses'],
      summary: 'Get all active recurring templates',
      responses: {
        200: {
          description: 'List of recurring expense templates',
        },
      },
    },
    post: {
      tags: ['Recurring Expenses'],
      summary: 'Create a recurring expense template',
      description: 'Triggers immediately and generates all due standard expenses up to the current date.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['description', 'amount', 'interval', 'categoryId'],
              properties: {
                description: { type: 'string', example: 'Monthly House Rent' },
                amount: { type: 'number', example: 1200 },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR', example: 'USD' },
                startDate: { type: 'string', format: 'date-time', example: '2026-05-01T00:00:00.000Z' },
                interval: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], example: 'MONTHLY' },
                categoryId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Recurring template created, catch-up occurrences backfilled',
        },
      },
    },
  },
  '/api/expenses/recurring/{id}': {
    get: {
      tags: ['Recurring Expenses'],
      summary: 'Get details of a recurring template',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Recurring template details',
        },
      },
    },
    patch: {
      tags: ['Recurring Expenses'],
      summary: 'Update recurring template details (including enable/disable)',
      description: 'If isActive is updated to true (reactivated), nextDueDate is advanced to the future to skip backfilling.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                description: { type: 'string', example: 'Updated Rent Name' },
                amount: { type: 'number', example: 1250 },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], example: 'USD' },
                interval: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
                categoryId: { type: 'string', format: 'uuid' },
                isActive: { type: 'boolean', example: true, description: 'Toggle active status. Toggling to true advances nextDueDate to future.' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Template updated',
        },
      },
    },
    delete: {
      tags: ['Recurring Expenses'],
      summary: 'Delete a recurring template',
      description: 'Deletes the template. Generated historical expense transactions are preserved in the DB.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        204: {
          description: 'Template deleted',
        },
      },
    },
  },
  '/api/analytics/category-breakdown': {
    get: {
      tags: ['Analytics'],
      summary: 'Get category-wise expense breakdown',
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'targetCurrency', in: 'query', schema: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] }, description: 'Target currency for conversions' },
      ],
      responses: {
        200: {
          description: 'Breakdown data',
        },
      },
    },
  },
  '/api/analytics/category-trends': {
    get: {
      tags: ['Analytics'],
      summary: 'Get category-wise expense trends over time',
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'interval', in: 'query', required: true, schema: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' } },
        { name: 'targetCurrency', in: 'query', schema: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] }, description: 'Target currency for conversions' },
      ],
      responses: {
        200: {
          description: 'Trends data',
        },
      },
    },
  },
  '/api/analytics/category-comparison': {
    get: {
      tags: ['Analytics'],
      summary: 'Compare category-wise spending between two periods',
      parameters: [
        { name: 'currentStartDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'currentEndDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'compareStartDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'compareEndDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        { name: 'targetCurrency', in: 'query', schema: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] }, description: 'Target currency for conversions' },
      ],
      responses: {
        200: {
          description: 'Comparison data',
        },
      },
    },
  },
  '/api/analytics/category-drivers': {
    get: {
      tags: ['Analytics'],
      summary: 'Get top driver expenses (largest transactions)',
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } },
        { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'targetCurrency', in: 'query', schema: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] }, description: 'Target currency for conversions' },
      ],
      responses: {
        200: {
          description: 'Drivers list',
        },
      },
    },
  },
  '/api/budgets': {
    get: {
      tags: ['Budgets'],
      summary: 'Get active category and overall budgets with real-time spend progress',
      responses: {
        200: {
          description: 'Budgets health report',
        },
      },
    },
  },
  '/api/budgets/category': {
    post: {
      tags: ['Budgets'],
      summary: 'Set or update a category budget limit',
      description: "Pre-populates and locks budget currency to the user's home currency preference.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['categoryId', 'limit'],
              properties: {
                categoryId: { type: 'string', format: 'uuid', example: '1602e446-ac15-481e-a3f4-5e66339a9cdc' },
                limit: { type: 'number', example: 5000 },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Category budget upserted successfully',
        },
      },
    },
  },
  '/api/budgets/category/{categoryId}': {
    delete: {
      tags: ['Budgets'],
      summary: 'Delete a category budget limit',
      parameters: [
        { name: 'categoryId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        204: {
          description: 'Category budget deleted',
        },
      },
    },
  },
  '/api/budgets/monthly': {
    post: {
      tags: ['Budgets'],
      summary: 'Set or update the overall monthly spending budget limit',
      description: "Pre-populates and locks budget currency to the user's home currency preference.",
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['limit'],
              properties: {
                limit: { type: 'number', example: 30000 },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Overall monthly budget upserted successfully',
        },
      },
    },
    delete: {
      tags: ['Budgets'],
      summary: 'Delete the overall monthly budget limit',
      responses: {
        204: {
          description: 'Overall monthly budget deleted',
        },
      },
    },
  },
};

export const serveSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/api-docs`);
};
