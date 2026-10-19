import { Elysia, t } from 'elysia';
import { eq, and, desc, asc, ne } from 'drizzle-orm';
import { createDbConnection, users, projects, experiences, contacts, techStacks } from '../db';
import { verifyAuthToken, type AuthTokenPayload } from '../utils/jwt';

export interface AdminRouteOptions {
  db?: any;
  jwtSecret?: string;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Factory for Admin CMS routes.
 * Protected by JWT authentication and trusted role verification.
 */
export const createAdminRoutes = (options?: AdminRouteOptions) => {
  return new Elysia({ prefix: '/api/admin' })
    .onError(({ code, error, set }) => {
      if (code === 'VALIDATION') {
        set.status = 400;
        return {
          status: 'error',
          message: `Validation error: ${error?.message || 'Invalid request payload or parameters.'}`,
        };
      }
    })

    // -------------------------------------------------------------
    // JWT Authentication & Trusted Role Middleware
    // -------------------------------------------------------------
    .derive(async ({ headers }) => {
      const authHeader = headers['authorization'] || headers['Authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          authUser: null,
          authError: {
            status: 401,
            message: 'Unauthorized: Missing or invalid authorization token',
          },
        };
      }

      const token = authHeader.slice(7).trim();
      let payload: AuthTokenPayload;
      try {
        payload = await verifyAuthToken(token, options?.jwtSecret);
      } catch {
        return {
          authUser: null,
          authError: {
            status: 401,
            message: 'Unauthorized: Invalid or expired token',
          },
        };
      }

      // Query trusted user record from database
      const db = options?.db || createDbConnection();
      try {
        const userList = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          })
          .from(users)
          .where(eq(users.id, payload.id))
          .limit(1);

        if (!userList || userList.length === 0) {
          return {
            authUser: null,
            authError: {
              status: 401,
              message: 'Unauthorized: User not found or session revoked',
            },
          };
        }

        const dbUser = userList[0];

        // Ensure role from database is authorized
        if (dbUser.role !== 'admin' && dbUser.role !== 'superadmin') {
          return {
            authUser: null,
            authError: {
              status: 403,
              message: 'Forbidden: Insufficient privileges',
            },
          };
        }

        return {
          authUser: dbUser,
          authError: null,
        };
      } catch (dbErr: any) {
        console.error('❌ Database error during authorization check:', dbErr?.message || dbErr);
        return {
          authUser: null,
          authError: {
            status: 500,
            message: 'Database error during authorization check',
          },
        };
      }
    })
    .onBeforeHandle(({ authError, set }) => {
      if (authError) {
        set.status = authError.status;
        return {
          status: 'error',
          message: authError.message,
        };
      }
    })

    // =============================================================
    // 1. Admin Projects CRUD (/api/admin/projects)
    // =============================================================
    .group('/projects', (projectGroup) =>
      projectGroup
        // GET /api/admin/projects - List all projects
        .get(
          '',
          async ({ set }) => {
            const db = options?.db || createDbConnection();
            try {
              const results = await db
                .select()
                .from(projects)
                .orderBy(asc(projects.sortOrder), desc(projects.createdAt));

              return {
                status: 'success',
                data: results || [],
              };
            } catch (err: any) {
              console.error('❌ Database error listing admin projects:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to retrieve projects',
              };
            }
          },
          {
            detail: {
              summary: 'List Projects (Admin)',
              description: 'Lists all projects with full CMS metadata.',
              tags: ['Admin Projects'],
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: t.Object({
                status: t.Literal('success'),
                data: t.Array(
                  t.Object({
                    id: t.Number(),
                    title: t.String(),
                    slug: t.String(),
                    description: t.String(),
                    category: t.String(),
                    techStack: t.String(),
                    githubUrl: t.Nullable(t.String()),
                    liveDemoUrl: t.Nullable(t.String()),
                    imageUrl: t.Nullable(t.String()),
                    isFeatured: t.Boolean(),
                    sortOrder: t.Number(),
                    createdAt: t.Any(),
                    updatedAt: t.Any(),
                  })
                ),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // GET /api/admin/projects/:id - Project detail
        .get(
          '/:id',
          async ({ params, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const projectList = await db
                .select()
                .from(projects)
                .where(eq(projects.id, params.id))
                .limit(1);

              if (!projectList || projectList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Project not found',
                };
              }

              return {
                status: 'success',
                data: projectList[0],
              };
            } catch (err: any) {
              console.error('❌ Database error retrieving admin project:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to retrieve project detail',
              };
            }
          },
          {
            detail: {
              summary: 'Get Project Detail (Admin)',
              description: 'Retrieves full details of a project by its numeric ID.',
              tags: ['Admin Projects'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric project ID' }),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                data: t.Object({
                  id: t.Number(),
                  title: t.String(),
                  slug: t.String(),
                  description: t.String(),
                  category: t.String(),
                  techStack: t.String(),
                  githubUrl: t.Nullable(t.String()),
                  liveDemoUrl: t.Nullable(t.String()),
                  imageUrl: t.Nullable(t.String()),
                  isFeatured: t.Boolean(),
                  sortOrder: t.Number(),
                  createdAt: t.Any(),
                  updatedAt: t.Any(),
                }),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // POST /api/admin/projects - Create project
        .post(
          '',
          async ({ body, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const targetSlug =
                body.slug && body.slug.trim() !== ''
                  ? generateSlug(body.slug)
                  : generateSlug(body.title);

              if (!targetSlug) {
                set.status = 400;
                return {
                  status: 'error',
                  message: 'Invalid project title or slug: unable to generate valid slug',
                };
              }

              // Check for slug collision
              const existing = await db
                .select({ id: projects.id })
                .from(projects)
                .where(eq(projects.slug, targetSlug))
                .limit(1);

              if (existing && existing.length > 0) {
                set.status = 409;
                return {
                  status: 'error',
                  message: 'A project with this slug already exists',
                };
              }

              const newProjectData = {
                title: body.title.trim(),
                slug: targetSlug,
                description: body.description.trim(),
                category: body.category.trim(),
                techStack: body.techStack.trim(),
                githubUrl: body.githubUrl ?? null,
                liveDemoUrl: body.liveDemoUrl ?? null,
                imageUrl: body.imageUrl ?? null,
                isFeatured: body.isFeatured ?? false,
                sortOrder: body.sortOrder ?? 0,
              };

              const insertResult = await db.insert(projects).values(newProjectData);
              const insertedId =
                insertResult?.[0]?.insertId ||
                (Array.isArray(insertResult) && insertResult[0]?.id) ||
                1;

              const createdRecord = await db
                .select()
                .from(projects)
                .where(eq(projects.id, Number(insertedId)))
                .limit(1);

              set.status = 201;
              return {
                status: 'success',
                message: 'Project created successfully',
                data: createdRecord?.[0] || { id: Number(insertedId), ...newProjectData },
              };
            } catch (err: any) {
              console.error('❌ Database error creating admin project:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to create project',
              };
            }
          },
          {
            detail: {
              summary: 'Create Project (Admin)',
              description: 'Creates a new portfolio project entry.',
              tags: ['Admin Projects'],
              security: [{ bearerAuth: [] }],
            },
            body: t.Object({
              title: t.String({ minLength: 1, maxLength: 255, description: 'Project title' }),
              slug: t.Optional(t.String({ maxLength: 191, description: 'Unique slug (auto-generated if omitted)' })),
              description: t.String({ minLength: 1, description: 'Detailed project description' }),
              category: t.String({ minLength: 1, maxLength: 100, description: 'Project category' }),
              techStack: t.String({ minLength: 1, description: 'Comma-separated technologies used' }),
              githubUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              liveDemoUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              imageUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              isFeatured: t.Optional(t.Boolean({ default: false })),
              sortOrder: t.Optional(t.Number({ default: 0 })),
            }),
            response: {
              201: t.Object({
                status: t.Literal('success'),
                message: t.String(),
                data: t.Any(),
              }),
              400: t.Object({ status: t.Literal('error'), message: t.String() }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              409: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // PUT /api/admin/projects/:id - Update project
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const existingList = await db
                .select()
                .from(projects)
                .where(eq(projects.id, params.id))
                .limit(1);

              if (!existingList || existingList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Project not found',
                };
              }

              const updateData: Record<string, any> = {};

              if (body.title !== undefined) updateData.title = body.title.trim();
              if (body.description !== undefined) updateData.description = body.description.trim();
              if (body.category !== undefined) updateData.category = body.category.trim();
              if (body.techStack !== undefined) updateData.techStack = body.techStack.trim();
              if (body.githubUrl !== undefined) updateData.githubUrl = body.githubUrl;
              if (body.liveDemoUrl !== undefined) updateData.liveDemoUrl = body.liveDemoUrl;
              if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
              if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
              if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

              // Check slug if provided or if title changed and slug is updated
              if (body.slug !== undefined && body.slug.trim() !== '') {
                const targetSlug = generateSlug(body.slug);
                const collision = await db
                  .select({ id: projects.id })
                  .from(projects)
                  .where(and(eq(projects.slug, targetSlug), ne(projects.id, params.id)))
                  .limit(1);

                if (collision && collision.length > 0) {
                  set.status = 409;
                  return {
                    status: 'error',
                    message: 'Another project with this slug already exists',
                  };
                }
                updateData.slug = targetSlug;
              }

              if (Object.keys(updateData).length > 0) {
                await db
                  .update(projects)
                  .set(updateData)
                  .where(eq(projects.id, params.id));
              }

              const updatedRecord = await db
                .select()
                .from(projects)
                .where(eq(projects.id, params.id))
                .limit(1);

              return {
                status: 'success',
                message: 'Project updated successfully',
                data: updatedRecord[0],
              };
            } catch (err: any) {
              console.error('❌ Database error updating admin project:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to update project',
              };
            }
          },
          {
            detail: {
              summary: 'Update Project (Admin)',
              description: 'Updates attributes of an existing portfolio project.',
              tags: ['Admin Projects'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric project ID' }),
            }),
            body: t.Object({
              title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
              slug: t.Optional(t.String({ maxLength: 191 })),
              description: t.Optional(t.String({ minLength: 1 })),
              category: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
              techStack: t.Optional(t.String({ minLength: 1 })),
              githubUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              liveDemoUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              imageUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              isFeatured: t.Optional(t.Boolean()),
              sortOrder: t.Optional(t.Number()),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                message: t.String(),
                data: t.Any(),
              }),
              400: t.Object({ status: t.Literal('error'), message: t.String() }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              409: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // DELETE /api/admin/projects/:id - Delete project
        .delete(
          '/:id',
          async ({ params, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const existingList = await db
                .select({ id: projects.id })
                .from(projects)
                .where(eq(projects.id, params.id))
                .limit(1);

              if (!existingList || existingList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Project not found',
                };
              }

              await db.delete(projects).where(eq(projects.id, params.id));

              return {
                status: 'success',
                message: 'Project deleted successfully',
              };
            } catch (err: any) {
              console.error('❌ Database error deleting admin project:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to delete project',
              };
            }
          },
          {
            detail: {
              summary: 'Delete Project (Admin)',
              description: 'Removes a project from the portfolio.',
              tags: ['Admin Projects'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric project ID' }),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                message: t.String(),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )
    )

    // =============================================================
    // 2. Admin Experiences CRUD (/api/admin/experiences)
    // =============================================================
    .group('/experiences', (expGroup) =>
      expGroup
        // GET /api/admin/experiences - List all experiences
        .get(
          '',
          async ({ set }) => {
            const db = options?.db || createDbConnection();
            try {
              const results = await db
                .select()
                .from(experiences)
                .orderBy(asc(experiences.sortOrder), desc(experiences.startDate));

              return {
                status: 'success',
                data: results || [],
              };
            } catch (err: any) {
              console.error('❌ Database error listing admin experiences:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to retrieve experiences',
              };
            }
          },
          {
            detail: {
              summary: 'List Experiences (Admin)',
              description: 'Lists all career experiences with full CMS details.',
              tags: ['Admin Experiences'],
              security: [{ bearerAuth: [] }],
            },
            response: {
              200: t.Object({
                status: t.Literal('success'),
                data: t.Array(
                  t.Object({
                    id: t.Number(),
                    company: t.String(),
                    role: t.String(),
                    location: t.Nullable(t.String()),
                    startDate: t.String(),
                    endDate: t.Nullable(t.String()),
                    isCurrent: t.Boolean(),
                    description: t.String(),
                    certificateUrl: t.Optional(t.Nullable(t.String())),
                    certificateType: t.Optional(t.Nullable(t.String())),
                    certificateName: t.Optional(t.Nullable(t.String())),
                    sortOrder: t.Number(),
                    createdAt: t.Any(),
                    updatedAt: t.Any(),
                  })
                ),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // GET /api/admin/experiences/:id - Experience detail
        .get(
          '/:id',
          async ({ params, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const expList = await db
                .select()
                .from(experiences)
                .where(eq(experiences.id, params.id))
                .limit(1);

              if (!expList || expList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Experience not found',
                };
              }

              return {
                status: 'success',
                data: expList[0],
              };
            } catch (err: any) {
              console.error('❌ Database error retrieving admin experience:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to retrieve experience detail',
              };
            }
          },
          {
            detail: {
              summary: 'Get Experience Detail (Admin)',
              description: 'Retrieves full details of a specific experience by numeric ID.',
              tags: ['Admin Experiences'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric experience ID' }),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                data: t.Object({
                  id: t.Number(),
                  company: t.String(),
                  role: t.String(),
                  location: t.Nullable(t.String()),
                  startDate: t.String(),
                  endDate: t.Nullable(t.String()),
                  isCurrent: t.Boolean(),
                  description: t.String(),
                  certificateUrl: t.Optional(t.Nullable(t.String())),
                  certificateType: t.Optional(t.Nullable(t.String())),
                  certificateName: t.Optional(t.Nullable(t.String())),
                  sortOrder: t.Number(),
                  createdAt: t.Any(),
                  updatedAt: t.Any(),
                }),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // POST /api/admin/experiences - Create experience
        .post(
          '',
          async ({ body, set }) => {
            const db = options?.db || createDbConnection();
            try {
              // Date logic check
              const isCurrent = body.isCurrent ?? false;
              const endDate = isCurrent ? null : body.endDate ?? null;

              if (body.startDate && endDate && !isCurrent) {
                if (body.startDate > endDate) {
                  set.status = 400;
                  return {
                    status: 'error',
                    message: 'Invalid date range: startDate cannot be after endDate',
                  };
                }
              }

              const newExpData = {
                company: body.company.trim(),
                role: body.role.trim(),
                location: body.location ? body.location.trim() : null,
                startDate: body.startDate,
                endDate,
                isCurrent,
                description: body.description.trim(),
                certificateUrl: (body as any).certificateUrl ?? null,
                certificateType: (body as any).certificateType ?? null,
                certificateName: (body as any).certificateName ? (body as any).certificateName.trim() : null,
                sortOrder: body.sortOrder ?? 0,
              };

              const insertResult = await db.insert(experiences).values(newExpData);
              const insertedId =
                insertResult?.[0]?.insertId ||
                (Array.isArray(insertResult) && insertResult[0]?.id) ||
                1;

              const createdRecord = await db
                .select()
                .from(experiences)
                .where(eq(experiences.id, Number(insertedId)))
                .limit(1);

              set.status = 201;
              return {
                status: 'success',
                message: 'Experience created successfully',
                data: createdRecord?.[0] || { id: Number(insertedId), ...newExpData },
              };
            } catch (err: any) {
              console.error('❌ Database error creating admin experience:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to create experience',
              };
            }
          },
          {
            detail: {
              summary: 'Create Experience (Admin)',
              description: 'Creates a new professional experience entry.',
              tags: ['Admin Experiences'],
              security: [{ bearerAuth: [] }],
            },
            body: t.Object({
              company: t.String({ minLength: 1, maxLength: 150, description: 'Company name' }),
              role: t.String({ minLength: 1, maxLength: 150, description: 'Position title' }),
              location: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
              startDate: t.String({
                pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                description: 'Start date in YYYY-MM-DD format',
                examples: ['2023-01-15'],
              }),
              endDate: t.Optional(
                t.Nullable(
                  t.String({
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    description: 'End date in YYYY-MM-DD format (null for ongoing positions)',
                    examples: ['2024-06-30'],
                  })
                )
              ),
              isCurrent: t.Optional(t.Boolean({ default: false })),
              description: t.String({ minLength: 1, description: 'Responsibilities and accomplishments' }),
              certificateUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              certificateType: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
              certificateName: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              sortOrder: t.Optional(t.Number({ default: 0 })),
            }),
            response: {
              201: t.Object({
                status: t.Literal('success'),
                message: t.String(),
                data: t.Any(),
              }),
              400: t.Object({ status: t.Literal('error'), message: t.String() }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // PUT /api/admin/experiences/:id - Update experience
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const existingList = await db
                .select()
                .from(experiences)
                .where(eq(experiences.id, params.id))
                .limit(1);

              if (!existingList || existingList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Experience not found',
                };
              }

              const existing = existingList[0];
              const updateData: Record<string, any> = {};

              if (body.company !== undefined) updateData.company = body.company.trim();
              if (body.role !== undefined) updateData.role = body.role.trim();
              if (body.location !== undefined) updateData.location = body.location ? body.location.trim() : null;
              if (body.description !== undefined) updateData.description = body.description.trim();
              if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
              if ((body as any).certificateUrl !== undefined) updateData.certificateUrl = (body as any).certificateUrl;
              if ((body as any).certificateType !== undefined) updateData.certificateType = (body as any).certificateType;
              if ((body as any).certificateName !== undefined) updateData.certificateName = (body as any).certificateName ? (body as any).certificateName.trim() : null;

              const isCurrent = body.isCurrent !== undefined ? body.isCurrent : existing.isCurrent;
              updateData.isCurrent = isCurrent;

              const startDate = body.startDate !== undefined ? body.startDate : existing.startDate;
              if (body.startDate !== undefined) updateData.startDate = startDate;

              let endDate = body.endDate !== undefined ? body.endDate : existing.endDate;
              if (isCurrent) {
                endDate = null;
              }
              updateData.endDate = endDate;

              // Validate dates
              if (startDate && endDate && !isCurrent) {
                if (startDate > endDate) {
                  set.status = 400;
                  return {
                    status: 'error',
                    message: 'Invalid date range: startDate cannot be after endDate',
                  };
                }
              }

              if (Object.keys(updateData).length > 0) {
                await db
                  .update(experiences)
                  .set(updateData)
                  .where(eq(experiences.id, params.id));
              }

              const updatedRecord = await db
                .select()
                .from(experiences)
                .where(eq(experiences.id, params.id))
                .limit(1);

              return {
                status: 'success',
                message: 'Experience updated successfully',
                data: updatedRecord[0],
              };
            } catch (err: any) {
              console.error('❌ Database error updating admin experience:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to update experience',
              };
            }
          },
          {
            detail: {
              summary: 'Update Experience (Admin)',
              description: 'Updates attributes of an existing career experience.',
              tags: ['Admin Experiences'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric experience ID' }),
            }),
            body: t.Object({
              company: t.Optional(t.String({ minLength: 1, maxLength: 150 })),
              role: t.Optional(t.String({ minLength: 1, maxLength: 150 })),
              location: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
              startDate: t.Optional(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
              endDate: t.Optional(t.Nullable(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }))),
              isCurrent: t.Optional(t.Boolean()),
              description: t.Optional(t.String({ minLength: 1 })),
              certificateUrl: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              certificateType: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
              certificateName: t.Optional(t.Nullable(t.String({ maxLength: 255 }))),
              sortOrder: t.Optional(t.Number()),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                message: t.String(),
                data: t.Any(),
              }),
              400: t.Object({ status: t.Literal('error'), message: t.String() }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // DELETE /api/admin/experiences/:id - Delete experience
        .delete(
          '/:id',
          async ({ params, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const existingList = await db
                .select({ id: experiences.id })
                .from(experiences)
                .where(eq(experiences.id, params.id))
                .limit(1);

              if (!existingList || existingList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Experience not found',
                };
              }

              await db.delete(experiences).where(eq(experiences.id, params.id));

              return {
                status: 'success',
                message: 'Experience deleted successfully',
              };
            } catch (err: any) {
              console.error('❌ Database error deleting admin experience:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to delete experience',
              };
            }
          },
          {
            detail: {
              summary: 'Delete Experience (Admin)',
              description: 'Deletes a career experience entry.',
              tags: ['Admin Experiences'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric experience ID' }),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                message: t.String(),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )
    )

    // =============================================================
    // 3. Admin Contacts (/api/admin/contacts)
    // =============================================================
    .group('/contacts', (contactGroup) =>
      contactGroup
        // GET /api/admin/contacts - List inquiries with status filter
        .get(
          '',
          async ({ query, set }) => {
            const db = options?.db || createDbConnection();
            try {
              let queryBuilder = db.select().from(contacts);

              if (query?.status) {
                queryBuilder = queryBuilder.where(eq(contacts.status, query.status));
              }

              const results = await queryBuilder.orderBy(desc(contacts.createdAt));

              return {
                status: 'success',
                data: results || [],
              };
            } catch (err: any) {
              console.error('❌ Database error listing admin contacts:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to retrieve contact inquiries',
              };
            }
          },
          {
            detail: {
              summary: 'List Contact Inquiries (Admin)',
              description: 'Lists visitor contact messages, with optional status filter.',
              tags: ['Admin Contacts'],
              security: [{ bearerAuth: [] }],
            },
            query: t.Object({
              status: t.Optional(
                t.Union([t.Literal('unread'), t.Literal('read'), t.Literal('archived')], {
                  description: 'Filter messages by read status',
                })
              ),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                data: t.Array(
                  t.Object({
                    id: t.Number(),
                    name: t.String(),
                    email: t.String(),
                    subject: t.String(),
                    message: t.String(),
                    status: t.String(),
                    createdAt: t.Any(),
                  })
                ),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // GET /api/admin/contacts/:id - Contact detail
        .get(
          '/:id',
          async ({ params, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const contactList = await db
                .select()
                .from(contacts)
                .where(eq(contacts.id, params.id))
                .limit(1);

              if (!contactList || contactList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Contact message not found',
                };
              }

              return {
                status: 'success',
                data: contactList[0],
              };
            } catch (err: any) {
              console.error('❌ Database error retrieving admin contact:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to retrieve contact message',
              };
            }
          },
          {
            detail: {
              summary: 'Get Contact Message Detail (Admin)',
              description: 'Retrieves full message details of a specific contact inquiry.',
              tags: ['Admin Contacts'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric contact message ID' }),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                data: t.Object({
                  id: t.Number(),
                  name: t.String(),
                  email: t.String(),
                  subject: t.String(),
                  message: t.String(),
                  status: t.String(),
                  createdAt: t.Any(),
                }),
              }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )

        // PATCH /api/admin/contacts/:id/status - Update message status
        .patch(
          '/:id/status',
          async ({ params, body, set }) => {
            const db = options?.db || createDbConnection();
            try {
              const existingList = await db
                .select({ id: contacts.id })
                .from(contacts)
                .where(eq(contacts.id, params.id))
                .limit(1);

              if (!existingList || existingList.length === 0) {
                set.status = 404;
                return {
                  status: 'error',
                  message: 'Contact message not found',
                };
              }

              await db
                .update(contacts)
                .set({ status: body.status })
                .where(eq(contacts.id, params.id));

              const updatedRecord = await db
                .select()
                .from(contacts)
                .where(eq(contacts.id, params.id))
                .limit(1);

              return {
                status: 'success',
                message: 'Contact status updated successfully',
                data: updatedRecord[0],
              };
            } catch (err: any) {
              console.error('❌ Database error updating contact status:', err?.message || err);
              set.status = 500;
              return {
                status: 'error',
                message: 'Failed to update contact status',
              };
            }
          },
          {
            detail: {
              summary: 'Update Contact Status (Admin)',
              description: 'Updates read/archive status of a contact message.',
              tags: ['Admin Contacts'],
              security: [{ bearerAuth: [] }],
            },
            params: t.Object({
              id: t.Numeric({ description: 'Numeric contact message ID' }),
            }),
            body: t.Object({
              status: t.Union([t.Literal('unread'), t.Literal('read'), t.Literal('archived')]),
            }),
            response: {
              200: t.Object({
                status: t.Literal('success'),
                message: t.String(),
                data: t.Any(),
              }),
              400: t.Object({ status: t.Literal('error'), message: t.String() }),
              401: t.Object({ status: t.Literal('error'), message: t.String() }),
              403: t.Object({ status: t.Literal('error'), message: t.String() }),
              404: t.Object({ status: t.Literal('error'), message: t.String() }),
              500: t.Object({ status: t.Literal('error'), message: t.String() }),
            },
          }
        )
    )

    // =============================================================
    // 4. Admin Uploads (/api/admin/upload/certificate)
    // =============================================================
    .group('/upload', (uploadGroup) =>
      uploadGroup.post(
        '/certificate',
        async ({ body, set }) => {
          try {
            const file = (body as any)?.file;
            if (!file) {
              set.status = 400;
              return {
                status: 'error',
                message: 'No certificate file provided or invalid file payload.',
              };
            }

            const fileName = file.name || 'certificate.pdf';
            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
            if (!allowedExts.includes(ext)) {
              set.status = 400;
              return {
                status: 'error',
                message: 'Invalid file format. Allowed formats: PDF and images (.png, .jpg, .jpeg, .webp).',
              };
            }

            const isPdf = ext === 'pdf';
            const type = isPdf ? 'pdf' : 'image';
            const cleanBase = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
            const uniqueName = `${Date.now()}-${cleanBase}`;
            const targetDir = isPdf ? 'public/docs/certificates' : 'public/images/certificates';

            // Ensure destination directory exists and write file
            await Bun.write(`${targetDir}/.keep`, '');
            const targetPath = `${targetDir}/${uniqueName}`;
            await Bun.write(targetPath, file);

            const publicUrl = isPdf
              ? `/docs/certificates/${uniqueName}`
              : `/images/certificates/${uniqueName}`;

            return {
              status: 'success',
              message: 'Certificate uploaded successfully',
              data: {
                url: publicUrl,
                type,
                fileName: uniqueName,
              },
            };
          } catch (err: any) {
            console.error('❌ Error uploading certificate:', err?.message || err);
            set.status = 500;
            return {
              status: 'error',
              message: 'Failed to upload certificate file',
            };
          }
        },
        {
          detail: {
            summary: 'Upload Certificate (PDF or Image)',
            description: 'Uploads an experience completion certificate (PDF or Image) to public assets.',
            tags: ['Admin Uploads'],
            security: [{ bearerAuth: [] }],
          },
        }
      )
    )

    // =============================================================
    // 5. Admin Tech Stacks (/api/admin/tech-stacks)
    // =============================================================
    .group('/tech-stacks', (tsGroup) =>
      tsGroup
        // GET /api/admin/tech-stacks
        .get(
          '/',
          async ({ authUser, authError, set }) => {
            if (authError || !authUser) {
              set.status = authError?.status || 401;
              return { status: 'error', message: authError?.message || 'Unauthorized' };
            }

            const db = options?.db || createDbConnection();

            try {
              const list = await db
                .select()
                .from(techStacks)
                .orderBy(asc(techStacks.sortOrder), asc(techStacks.name));

              return {
                status: 'success',
                data: list,
              };
            } catch (err: any) {
              console.error('❌ Error fetching tech stacks in admin:', err?.message || err);
              set.status = 500;
              return { status: 'error', message: 'Failed to retrieve tech stacks' };
            }
          },
          {
            detail: {
              summary: 'List All Tech Stacks',
              tags: ['Admin Tech Stacks'],
              security: [{ bearerAuth: [] }],
            },
          }
        )

        // POST /api/admin/tech-stacks
        .post(
          '/',
          async ({ authUser, authError, body, set }) => {
            if (authError || !authUser) {
              set.status = authError?.status || 401;
              return { status: 'error', message: authError?.message || 'Unauthorized' };
            }

            const db = options?.db || createDbConnection();

            try {
              const { name, category, proficiency, isLearning, icon, sortOrder } = body as any;

              if (!name?.trim() || !category?.trim()) {
                set.status = 400;
                return { status: 'error', message: 'Name and category are required' };
              }

              const [result] = await db.insert(techStacks).values({
                name: name.trim(),
                category: category.trim(),
                proficiency: proficiency?.trim() || 'Proficient',
                isLearning: Boolean(isLearning),
                icon: icon?.trim() || null,
                sortOrder: Number(sortOrder) || 0,
              });

              const insertedId = (result as any)?.insertId || result;

              set.status = 201;
              return {
                status: 'success',
                message: 'Tech stack created successfully',
                data: {
                  id: Number(insertedId),
                  name: name.trim(),
                  category: category.trim(),
                  proficiency: proficiency?.trim() || 'Proficient',
                  isLearning: Boolean(isLearning),
                  icon: icon?.trim() || null,
                  sortOrder: Number(sortOrder) || 0,
                },
              };
            } catch (err: any) {
              console.error('❌ Error creating tech stack:', err?.message || err);
              set.status = 500;
              return { status: 'error', message: 'Failed to create tech stack' };
            }
          },
          {
            detail: {
              summary: 'Create Tech Stack',
              tags: ['Admin Tech Stacks'],
              security: [{ bearerAuth: [] }],
            },
          }
        )

        // PUT /api/admin/tech-stacks/:id
        .put(
          '/:id',
          async ({ authUser, authError, params: { id }, body, set }) => {
            if (authError || !authUser) {
              set.status = authError?.status || 401;
              return { status: 'error', message: authError?.message || 'Unauthorized' };
            }

            const db = options?.db || createDbConnection();
            const stackId = Number(id);

            if (isNaN(stackId)) {
              set.status = 400;
              return { status: 'error', message: 'Invalid tech stack ID' };
            }

            try {
              const existing = await db.select().from(techStacks).where(eq(techStacks.id, stackId)).limit(1);
              if (!existing || existing.length === 0) {
                set.status = 404;
                return { status: 'error', message: 'Tech stack not found' };
              }

              const { name, category, proficiency, isLearning, icon, sortOrder } = body as any;

              await db
                .update(techStacks)
                .set({
                  ...(name ? { name: name.trim() } : {}),
                  ...(category ? { category: category.trim() } : {}),
                  ...(proficiency !== undefined ? { proficiency: proficiency.trim() } : {}),
                  ...(isLearning !== undefined ? { isLearning: Boolean(isLearning) } : {}),
                  ...(icon !== undefined ? { icon: icon?.trim() || null } : {}),
                  ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
                })
                .where(eq(techStacks.id, stackId));

              const [updated] = await db.select().from(techStacks).where(eq(techStacks.id, stackId)).limit(1);

              return {
                status: 'success',
                message: 'Tech stack updated successfully',
                data: updated,
              };
            } catch (err: any) {
              console.error('❌ Error updating tech stack:', err?.message || err);
              set.status = 500;
              return { status: 'error', message: 'Failed to update tech stack' };
            }
          },
          {
            detail: {
              summary: 'Update Tech Stack',
              tags: ['Admin Tech Stacks'],
              security: [{ bearerAuth: [] }],
            },
          }
        )

        // DELETE /api/admin/tech-stacks/category/:categoryName
        .delete(
          '/category/:categoryName',
          async ({ authUser, authError, params: { categoryName }, set }) => {
            if (authError || !authUser) {
              set.status = authError?.status || 401;
              return { status: 'error', message: authError?.message || 'Unauthorized' };
            }

            const db = options?.db || createDbConnection();
            const decodedCategory = decodeURIComponent(categoryName || '').trim();

            if (!decodedCategory) {
              set.status = 400;
              return { status: 'error', message: 'Category name is required' };
            }

            try {
              const existing = await db
                .select()
                .from(techStacks)
                .where(eq(techStacks.category, decodedCategory));

              if (!existing || existing.length === 0) {
                set.status = 404;
                return { status: 'error', message: `Field/Category "${decodedCategory}" not found or already empty` };
              }

              await db.delete(techStacks).where(eq(techStacks.category, decodedCategory));

              return {
                status: 'success',
                message: `Field/Category "${decodedCategory}" and all its ${existing.length} tech stack(s) were deleted successfully`,
                deletedCount: existing.length,
              };
            } catch (err: any) {
              console.error('❌ Error deleting tech stack category:', err?.message || err);
              set.status = 500;
              return { status: 'error', message: 'Failed to delete tech stack category' };
            }
          },
          {
            detail: {
              summary: 'Delete Tech Stack Category',
              tags: ['Admin Tech Stacks'],
              security: [{ bearerAuth: [] }],
            },
          }
        )

        // DELETE /api/admin/tech-stacks/:id
        .delete(
          '/:id',
          async ({ authUser, authError, params: { id }, set }) => {
            if (authError || !authUser) {
              set.status = authError?.status || 401;
              return { status: 'error', message: authError?.message || 'Unauthorized' };
            }

            const db = options?.db || createDbConnection();
            const stackId = Number(id);

            if (isNaN(stackId)) {
              set.status = 400;
              return { status: 'error', message: 'Invalid tech stack ID' };
            }

            try {
              const existing = await db.select().from(techStacks).where(eq(techStacks.id, stackId)).limit(1);
              if (!existing || existing.length === 0) {
                set.status = 404;
                return { status: 'error', message: 'Tech stack not found' };
              }

              await db.delete(techStacks).where(eq(techStacks.id, stackId));

              return {
                status: 'success',
                message: 'Tech stack deleted successfully',
              };
            } catch (err: any) {
              console.error('❌ Error deleting tech stack:', err?.message || err);
              set.status = 500;
              return { status: 'error', message: 'Failed to delete tech stack' };
            }
          },
          {
            detail: {
              summary: 'Delete Tech Stack',
              tags: ['Admin Tech Stacks'],
              security: [{ bearerAuth: [] }],
            },
          }
        )
    );
};

export const adminRoutes = createAdminRoutes();
