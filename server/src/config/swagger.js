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
  '/api/groups': {
    post: {
      tags: ['Groups'],
      summary: 'Create a new group',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', example: 'Summer Vacation' },
                description: { type: 'string', example: 'Expenses for summer trip 2026' },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'], default: 'INR' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Group created successfully',
        },
      },
    },
    get: {
      tags: ['Groups'],
      summary: 'List active and archived user groups',
      responses: {
        200: {
          description: 'List of groups',
        },
      },
    },
  },
  '/api/groups/{id}': {
    get: {
      tags: ['Groups'],
      summary: 'Get details of a group (approved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Group details card',
        },
      },
    },
    patch: {
      tags: ['Groups'],
      summary: 'Update group details (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                currency: { type: 'string', enum: ['INR', 'USD', 'EUR', 'AUD'] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Group updated',
        },
      },
    },
    delete: {
      tags: ['Groups'],
      summary: 'Soft delete a group (Owner only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Group soft deleted successfully',
        },
      },
    },
  },
  '/api/groups/{id}/archive': {
    post: {
      tags: ['Groups'],
      summary: 'Archive a group (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Group archived successfully',
        },
      },
    },
  },
  '/api/groups/{id}/unarchive': {
    post: {
      tags: ['Groups'],
      summary: 'Unarchive a group (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Group unarchived successfully',
        },
      },
    },
  },
  '/api/groups/join/code': {
    post: {
      tags: ['Group Membership & Invitations'],
      summary: 'Join a group using unique join code',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['joinCode'],
              properties: {
                joinCode: { type: 'string', example: 'A1B2C3D4' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Join request pending',
        },
      },
    },
  },
  '/api/groups/join/invite': {
    post: {
      tags: ['Group Membership & Invitations'],
      summary: 'Join a group using invite token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: { type: 'string', example: 'invite_token_string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Join request pending via invitation token',
        },
      },
    },
  },
  '/api/groups/{id}/invitations/email': {
    post: {
      tags: ['Group Membership & Invitations'],
      summary: 'Invite a member by email (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['invitedEmail'],
              properties: {
                invitedEmail: { type: 'string', format: 'email', example: 'friend@example.com' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Invitation sent successfully',
        },
      },
    },
  },
  '/api/groups/{id}/invitations/code': {
    get: {
      tags: ['Group Membership & Invitations'],
      summary: 'Get/Fetch group join code (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Join code details',
        },
      },
    },
  },
  '/api/groups/{id}/members/approve': {
    patch: {
      tags: ['Group Membership & Invitations'],
      summary: 'Approve a pending group join request (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['memberUserId'],
              properties: {
                memberUserId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Member approved successfully',
        },
      },
    },
  },
  '/api/groups/{id}/members/reject': {
    patch: {
      tags: ['Group Membership & Invitations'],
      summary: 'Reject a pending group join request (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['memberUserId'],
              properties: {
                memberUserId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Member rejected successfully',
        },
      },
    },
  },
  '/api/groups/{id}/members/role': {
    patch: {
      tags: ['Group Membership & Invitations'],
      summary: 'Update member role - appoint/remove admin (Owner only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['memberUserId', 'role'],
              properties: {
                memberUserId: { type: 'string', format: 'uuid' },
                role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Role updated successfully',
        },
      },
    },
  },
  '/api/groups/{id}/members/transfer-owner': {
    post: {
      tags: ['Group Membership & Invitations'],
      summary: 'Transfer group ownership (Owner only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['memberUserId'],
              properties: {
                memberUserId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Ownership transferred successfully',
        },
      },
    },
  },
  '/api/groups/{id}/members/leave': {
    post: {
      tags: ['Group Membership & Invitations'],
      summary: 'Leave a group (Self-leave)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Member left group successfully',
        },
      },
    },
  },
  '/api/groups/{id}/members/remove': {
    delete: {
      tags: ['Group Membership & Invitations'],
      summary: 'Remove a member from the group (Owner/Admins only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['memberUserId'],
              properties: {
                memberUserId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Member removed successfully',
        },
      },
    },
  },
  '/api/groups/{id}/expenses': {
    post: {
      tags: ['Group Expenses'],
      summary: 'Record a new group expense (Approved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'amount', 'paidById', 'category', 'splitType'],
              properties: {
                title: { type: 'string', example: 'Group Dinner' },
                description: { type: 'string', example: 'Saturday dinner' },
                amount: { type: 'number', example: 1200 },
                paidById: { type: 'string', format: 'uuid' },
                category: { type: 'string', enum: ['Food', 'Fuel', 'Hotel', 'Shopping', 'Travel', 'Entertainment', 'Medical', 'Miscellaneous'] },
                splitType: { type: 'string', enum: ['EQUAL', 'EXACT', 'SHARES', 'CUSTOM'] },
                splits: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string', format: 'uuid' },
                      amountOwed: { type: 'number' },
                      share: { type: 'number' },
                    },
                  },
                },
                receiptImage: { type: 'string', description: 'Base64 data URI of receipt image' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Expense recorded successfully',
        },
      },
    },
    get: {
      tags: ['Group Expenses'],
      summary: 'List group expenses (Approved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'search', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'List of expenses',
        },
      },
    },
  },
  '/api/groups/{id}/expenses/{expenseId}': {
    patch: {
      tags: ['Group Expenses'],
      summary: 'Update group expense (Owner/Admins or Creator only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'expenseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                amount: { type: 'number' },
                paidById: { type: 'string', format: 'uuid' },
                category: { type: 'string', enum: ['Food', 'Fuel', 'Hotel', 'Shopping', 'Travel', 'Entertainment', 'Medical', 'Miscellaneous'] },
                splitType: { type: 'string', enum: ['EQUAL', 'EXACT', 'SHARES', 'CUSTOM'] },
                splits: { type: 'array', items: { type: 'object' } },
                receiptImage: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Expense updated successfully',
        },
      },
    },
    delete: {
      tags: ['Group Expenses'],
      summary: 'Delete group expense (Owner/Admins or Creator only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'expenseId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Expense deleted successfully',
        },
      },
    },
  },
  '/api/groups/{id}/settlements/suggested': {
    get: {
      tags: ['Group Settlements'],
      summary: 'Get optimized suggested settlements to balance group ledger',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Optimized suggested transactions',
        },
      },
    },
  },
  '/api/groups/{id}/settlements': {
    post: {
      tags: ['Group Settlements'],
      summary: 'Record a settlement payment between members (Approved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['payerId', 'receiverId', 'amount'],
              properties: {
                payerId: { type: 'string', format: 'uuid' },
                receiverId: { type: 'string', format: 'uuid' },
                amount: { type: 'number', example: 200 },
                status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Settlement recorded successfully',
        },
      },
    },
    get: {
      tags: ['Group Settlements'],
      summary: 'List settlements in a group (Approved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'List of recorded settlements',
        },
      },
    },
  },
  '/api/groups/{id}/settlements/{settlementId}': {
    patch: {
      tags: ['Group Settlements'],
      summary: 'Update settlement status (Owner/Admins or involved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'settlementId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Settlement status updated successfully',
        },
      },
    },
  },
  '/api/groups/{id}/activity-logs': {
    get: {
      tags: ['Groups'],
      summary: 'Get group activity history (Approved members only)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'List of activity logs',
        },
      },
    },
  },
  '/api/groups/{id}/reports/summary': {
    get: {
      tags: ['Reports & Summaries'],
      summary: 'Get overall group summary and member balance sheet',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Group summary report card',
        },
      },
    },
  },
  '/api/groups/{id}/reports/category': {
    get: {
      tags: ['Reports & Summaries'],
      summary: 'Get category-wise group spending summary',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Category spending report',
        },
      },
    },
  },
  '/api/groups/{id}/reports/monthly': {
    get: {
      tags: ['Reports & Summaries'],
      summary: 'Get monthly chronological group spending breakdown',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Monthly spending report',
        },
      },
    },
  },
  '/api/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'List user notifications history',
      responses: {
        200: {
          description: 'Notifications list',
        },
      },
    },
  },
  '/api/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark a specific notification as read',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Notification marked read successfully',
        },
      },
    },
  },
};

export const serveSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/api-docs`);
};
