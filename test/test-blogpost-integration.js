'use strict';

const chai = require('chai');
const chaiHttp = require('chaiHttp');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
	console.info('seeding blog post data');
	const seedData = [];

	for (let i=1; i<=10; i++) {
		seedData.push(generateBlogPostData());
	}

	return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
	return {
		author: {
			firstName: faker.Name.firstName(),
			lastName: faker.Name.lastName()
		}, 
		title: faker.Lorem.sentence(),
		content: faker.Lorem.paragraph(),
		created: faker.Date.recent()
	};
}

function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('BlogPost API resource', function() {
	
	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogPostData();
	});

	afterEach(function() {
		return tearDownDb();
	});	

	after(function() {
		return closeServer();
	});

	describe('GET endpoint', function() {

		it('should return all existing blog posts', function() {
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res) {
					res = _res;
					expect(res).to.have.status(200);
					expect(res.body.posts).to.have.length.of.at.least(1);
					return BlogPost.count();
				})
				then(function(count) {
					expect(res.body.posts).to.have.length.of(count);
				});
		});

		it('should return posts with right fields', function() {

			let resBlogPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body.posts).to.be.a('array');
					expect(res.body.posts).to.have.length.of.at.least(1);

					res.body.posts.forEach(function(post) {
						expect(post).to.be.a('object');
						expect(post).to.include.keys('title', 'content', 'author', 'created');
					});
					resBlogPost = res.body.posts[0];
					return BlogPost.findById(resBlogPost.id);
				})
				.then(function(post) {

					expect(resBlogPost.id).to.equal(post.id);
					expect(resBlogPost.title).to.equal(post.title);
					expect(resBlogPost.author).to.equal(post.author);
					expect(resBlogPost.content).to.equal(post.content);
					expect(resBlogPost.created).to.equal(post.created);
				});
		});
	});

	describe('POST endpoint', function() {

		it('should add a new blog post', function() {

			const newBlogPost = generateBlogPostData();

			return chai.request(app)
				.post('./posts')
				.send(newBlogPost)
				.then(function(res) {
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys('title', 'content', 'author', 'created');
					expect(res.body.title).to.equal(newBlogPost.title);
					expect(res.body.id).to.not.be.null;
					expect(res.body.content).to.equal(newBlogPost.content);
					expect(res.body.author.firstName).to.equal(newBlogPost.author.firstName);
					expect(res.body.author.lastName).to.equal(newBlogPost.author.lastName);
					expect(res.body.created).to.equal(newBlogPost.created);
					return BlogPost.findById(res.body.id);
				})
				.then(function(post) {
					expect(post.title).to.equal(newBlogPost.title);
					expect(post.content).to.equal(newBlogPost.content);
					expect(post.author.firstName).to.equal(newBlogPost.author.firstName);
					expect(post.author.lastName).to.equal(newBlogPost.author.lastName);
					expect(post.created).to.equal(newBlogPost.created);
				});
		});
	});

	describe('PUT endpoint', function() {

		it('should update fields you send over', function() {
			const updateData = {
				title: 'This is an updated title', 
				content: 'This is some updated blog post content lorem ipsum'
			};

			return BlogPost
				.findOne()
				.then(function(post) {
					updateData.id = post.id;

					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData);
				})
				.then(function(res) {
					expect(res).to.have.status(204);

					return BlogPost.findById(updateData.id);
				})
				.then(function(post) {
					expect(post.title).to.equal(updateData.title);
					expect(post.content).to.equal(updateData.content);
				});
		});
	});

	describe('DELETE endpoint', function() {

		it('should delete a post by id', function() {

			let post;

			return BlogPost
				.findOne()
				.then(function(_post) {
					post = _post;
					return chai.request(app).delete(`/posts/${post.id}`);
				})
				.then(function(res) {
					expect(res).to.have.status(204);
					return BlogPost.findById(post.id);
				})
				.then(function(_post) {
					expect(_post).to.be.null;
				});
		});
	});
});